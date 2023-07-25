const { GObject } = imports.gi;
const Main = imports.ui.main;
const GETTEXT_DOMAIN = 'github-actions-extension';

const extension = imports.misc.extensionUtils.getCurrentExtension();

const { DataRepository } = extension.imports.app.data_repository;
const { DataUsageController } = extension.imports.app.data_usage_controller;
const { SettingsRepository } = extension.imports.app.settings_repository;
const { StatusBarState } = extension.imports.app.status_bar_indicator;

async function fetchUserData(settings, settingsRepository, dataRepository, simpleMode) {
    return new Promise(async (resolve, reject) => {
        try {
            const pagination = settingsRepository.fetchPagination(settings);

            const user = await dataRepository.fetchUser();
            const login = user['login'];

            /// Simple Mode
            const minutes = await dataRepository.fetchUserBillingActionsMinutes(login);
            const packages = await dataRepository.fetchUserBillingPackages(login);
            const sharedStorage = await dataRepository.fetchUserBillingSharedStorage(login);

            if (simpleMode) {
                resolve({
                    "user": user,
                    "minutes": minutes,
                    "packages": packages,
                    "sharedStorage": sharedStorage,
                });

                return;
            }

            /// Full Mode
            const starredList = await dataRepository.fetchUserStarred(login, pagination);
            const followers = await dataRepository.fetchUserFollowers(pagination);
            const following = await dataRepository.fetchUserFollowing(pagination);
            const repos = await dataRepository.fetchUserRepos(pagination);

            resolve({
                "user": user,
                "minutes": minutes,
                "packages": packages,
                "sharedStorage": sharedStorage,

                "starredList": starredList,
                "followers": followers,
                "following": following,
                "repos": repos,
            });
        } catch (error) {
            logError(error);
            resolve(null);
        }
    });
}

async function fetchRepoData(settings, settingsRepository, dataRepository, simpleMode) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = settingsRepository.ownerAndRepo(settings);
            const pagination = settingsRepository.fetchPagination(settings);

            /// Simple Mode
            const runs = await dataRepository.fetchWorkflowRuns(owner, repo, pagination);
            const artifacts = await dataRepository.fetchArtifacts(owner, repo, pagination);

            if (simpleMode) {
                resolve({
                    "runs": runs,
                    "artifacts": artifacts,
                });

                return;
            }

            /// Full Mode
            const userRepo = await dataRepository.fetchUserRepo(owner, repo);
            const workflows = await dataRepository.fetchWorkflows(owner, repo, pagination);
            const stargazers = await dataRepository.fetchStargazers(owner, repo, pagination);
            const releases = await dataRepository.fetchReleases(owner, repo, pagination);
            const branches = await dataRepository.fetchBranches(owner, repo, pagination);

            resolve({
                "runs": runs,
                "artifacts": artifacts,

                "userRepo": userRepo,
                "workflows": workflows,
                "stargazers": stargazers,
                "releases": releases,
                "branches": branches,
            });
        } catch (error) {
            logError(error);
            resolve(null);
        }
    });
}

/// Main 3 refresh Functions ----------------------------------------------------------------------
async function stateRefresh(settings, settingsRepository, indicator, dataRepository) {
    try {
        indicator.refreshBoredIcon();

        const isInstalledCli = await dataRepository.isInstalledCli();
        if (isInstalledCli == false) {
            indicator.setState({ state: StatusBarState.NOT_INSTALLED_CLI });
            return;
        }

        const isLogged = await dataRepository.isLogged();
        if (isLogged == false) {
            indicator.setState({ state: StatusBarState.NOT_LOGGED });
            return;
        }

        if (!settingsRepository.isRepositoryEntered(settings)) {
            indicator.setState({ state: StatusBarState.LOGGED_NOT_CHOOSED_REPO });
            return;
        }
    } catch (error) {
        logError(error);
    }
}

async function dataRefresh(settings, settingsRepository, indicator, dataRepository, dataUsageController, onRepoSetAsWatched, onDeleteWorkflowRun, refreshCallback) {
    try {
        if (indicator.isLogged == false) {
            return;
        }

        const simpleMode = settingsRepository.fetchSimpleMode(settings);

        const {
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            repos,
        } = await fetchUserData(settings, settingsRepository, dataRepository, simpleMode);

        const userObjects = [
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            repos,
        ];

        indicator.setUser(user);
        indicator.setUserBilling(minutes, packages, sharedStorage);
        indicator.setUserStarred(starredList);
        indicator.setUserFollowers(followers);
        indicator.setUserFollowing(following);
        indicator.setUserRepos(repos, (owner, repo) => {
            onRepoSetAsWatched(owner, repo);

            settingsRepository.updateOwner(settings, owner);
            settingsRepository.updateRepo(settings, repo);

            refreshCallback();
        });

        if (!indicator.isCorrectState()) {
            dataUsageController.updateTransfer(userObjects);
            return;
        }

        const {
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        } = await fetchRepoData(settings, settingsRepository, dataRepository, simpleMode);

        const repoObjects = [
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        ];

        dataUsageController.updateTransfer([...userObjects, ...repoObjects]);

        indicator.setWatchedRepo(userRepo);
        indicator.setWorkflows(workflows === undefined ? null : workflows['workflows']);
        indicator.setArtifacts(artifacts === undefined ? null : artifacts['artifacts']);
        indicator.setStargazers(stargazers);
        indicator.setWorkflowRuns({
            runs: runs['workflow_runs'],
            onDeleteWorkflowRun: (runId, runName) => onDeleteWorkflowRun(runId, runName),
        });
        indicator.setReleases(releases);
        indicator.setBranches(branches);
    } catch (error) {
        logError(error);
    }
}

async function githubActionsRefresh(settings, settingsRepository, indicator, dataRepository, dataUsageController, onBuildCompleted) {
    try {
        const isLogged = await dataRepository.isLogged();
        if (isLogged == false) {
            return;
        }

        const transferTerxt = dataUsageController.fullDataConsumptionPerHour();
        indicator.setTransferText(transferTerxt);

        if (!settingsRepository.isRepositoryEntered(settings)) {
            return;
        }

        const { owner, repo } = settingsRepository.ownerAndRepo(settings);
        const run = await dataRepository.fetchWorkflowRuns(owner, repo, 1);
        if (run == null) {
            indicator.setState({ state: StatusBarState.INCORRECT_REPOSITORY });
            return;
        }

        settingsRepository.updatePackageSize(run['_size_']);

        const runs = run['workflow_runs'];
        if (runs.length == 0) {
            indicator.setState({ state: StatusBarState.REPO_WITHOUT_ACTIONS });
            return;
        }

        /// Notification
        const previousState = indicator.state;
        indicator.setLatestWorkflowRun(runs[0]);
        const currentState = indicator.state;

        if (indicator.shouldShowCompletedNotification(previousState, currentState)) {
            switch (currentState) {
                case StatusBarState.COMPLETED_SUCCESS:
                    onBuildCompleted(owner, repo, 'success');
                    break;
                case StatusBarState.COMPLETED_FAILURE:
                    onBuildCompleted(owner, repo, 'failure');
                    break;
                case StatusBarState.COMPLETED_CANCELLED:
                    onBuildCompleted(owner, repo, 'cancelled');
                    break;
            }
        }
    } catch (error) {
        logError(error);
    }
}

var DataController = class {
    constructor(settings) {
        this.settings = settings;
        this.dataRepository = new DataRepository(settings);
        this.settingsRepository = new SettingsRepository(settings);
        this.dataUsageController = new DataUsageController(settings);
    }

    fetchIsInstalledCli = async () => await this.dataRepository.isInstalledCli();

    fetchIsLogged = async () => await this.dataRepository.isLogged();

    /// Main 3 refresh Functions
    refreshState() {
        stateRefresh(
            this.settings,
            this.settingsRepository,
            this.indicator,
            this.dataRepository,
        );
    }

    refreshGithubActions() {
        githubActionsRefresh(
            this.settings,
            this.settingsRepository,
            this.indicator,
            this.dataRepository,
            this.dataUsageController,
            (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion),
        );
    }

    refreshData() {
        dataRefresh(
            this.settings,
            this.settingsRepository,
            this.indicator,
            this.dataRepository,
            this.dataUsageController,
            this.onRepoSetAsWatched,
            (runId, runName) => this.removeWorkflowRun(runId, runName),
            () => this.refresh(),
        );
    }

    refresh() {
        try {
            this.refreshState();
            this.refreshGithubActions();
            this.refreshData();
        } catch (error) {
            logError(error);
        }
    }

    /// Start / Stop
    startRefreshing({
        indicator,
        onRepoSetAsWatched,
        onDeleteWorkflowRun,
        onBuildCompleted,
    }) {
        this.indicator = indicator;
        this.onRepoSetAsWatched = onRepoSetAsWatched;
        this.onDeleteWorkflowRun = onDeleteWorkflowRun;
        this.onBuildCompleted = onBuildCompleted;

        const settingsRepository = this.settingsRepository;

        try {
            const stateRefreshTime = 1 * 1000;
            const githubActionsRefreshTime = settingsRepository.fetchRefreshTime(this.settings) * 1000;
            const dataRefreshTime = settingsRepository.fetchRefreshFullUpdateTime(this.settings) * 60 * 1000;

            this.stateRefreshInterval = setInterval(() => this.refreshState(), stateRefreshTime);
            this.githubActionsRefreshInterval = setInterval(() => this.refreshGithubActions(), githubActionsRefreshTime);
            this.dataRefreshInterval = setInterval(() => this.refreshData(), dataRefreshTime);

            this.observeSettings(settingsRepository);
        } catch (error) {
            logError(error);
        }
    }

    stopRefreshing() {
        clearInterval(this.stateRefreshInterval);
        this.stateRefreshInterval = null;

        clearInterval(this.githubActionsRefreshInterval);
        this.githubActionsRefreshInterval = null;

        clearInterval(this.dataRefreshInterval);
        this.dataRefreshInterval = null;
    }

    /// Others
    observeSettings(settingsRepository) {
        this.settings.connect('changed::refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing({
                indicator: indicator,
                onRepoSetAsWatched: onRepoSetAsWatched,
                onDeleteWorkflowRun: onDeleteWorkflowRun,
                onBuildCompleted: onBuildCompleted,
            });
        });

        this.settings.connect('changed::full-refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing({
                indicator: indicator,
                onRepoSetAsWatched: onRepoSetAsWatched,
                onDeleteWorkflowRun: onDeleteWorkflowRun,
                onBuildCompleted: onBuildCompleted,
            });
        });

        this.settings.connect('changed::simple-mode', (settings, key) => {
            const simpleMode = settingsRepository.fetchSimpleMode(settings);
            this.indicator.setSimpleMode(simpleMode);
        });

        this.settings.connect('changed::colored-mode', (settings, key) => {
            const coloredMode = settingsRepository.fetchColoredMode(settings);
            this.indicator.setColoredMode(coloredMode);
        });

        this.settings.connect('changed::uppercase-mode', (settings, key) => {
            const uppercaseMode = settingsRepository.fetchUppercaseMode(settings);
            this.indicator.setUppercaseMode(uppercaseMode);
        });
    }

    async logout(indicator) {
        const isLogged = await this.dataRepository.logoutUser();

        if (isLogged == true) {
            indicator.setState({ state: StatusBarState.NOT_LOGGED });
        }
    }

    async downloadArtifact({ downloadUrl, filename, onFinishCallback }) {
        const success = await this.dataRepository.downloadArtifactFile(downloadUrl, filename);

        onFinishCallback(success, filename);
    }

    async removeWorkflowRun(runId, runName) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo(this.settings);

            const status = await this.dataRepository.deleteWorkflowRun(owner, repo, runId);

            if (status == 'success') {
                this.onDeleteWorkflowRun(true, runName);
                this.refreshData();
            } else {
                this.onDeleteWorkflowRun(false, runName);
            }
        } catch (error) {
            logError(error);
        }
    }

    fetchAppearanceSettings() {
        const simpleMode = this.settingsRepository.fetchSimpleMode();
        const coloredMode = this.settingsRepository.fetchColoredMode();
        const uppercaseMode = this.settingsRepository.fetchUppercaseMode();

        return {
            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
        };
    }
}
