const { GObject } = imports.gi;
const Main = imports.ui.main;
const GETTEXT_DOMAIN = 'github-actions-extension';

const extension = imports.misc.extensionUtils.getCurrentExtension();

const { GithubApiRepository } = extension.imports.app.github_api_repository;
const { SettingsRepository } = extension.imports.app.settings_repository;
const { StatusBarState } = extension.imports.app.status_bar_indicator;

async function fetchUserData(settings, settingsRepository, githubApiRepository, simpleMode) {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await githubApiRepository.fetchUser();
            if (user == null) {
                return;
            }

            const login = user['login'];

            
            /// Simple Mode
            const minutes = await githubApiRepository.fetchUserBillingActionsMinutes(login);
            const packages = await githubApiRepository.fetchUserBillingPackages(login);
            const sharedStorage = await githubApiRepository.fetchUserBillingSharedStorage(login);
            
            /// Hidden Mode
            const { owner, repo } = settingsRepository.ownerAndRepo(settings);
            const isStarred = await githubApiRepository.checkIsRepoStarred(owner, repo);
            settingsRepository.updateHiddenMode(isStarred === 'success');

            if (simpleMode) {
                resolve({
                    "user": user,
                    "minutes": minutes,
                    "packages": packages,
                    "sharedStorage": sharedStorage,
                });
                
                return;
            }

            const pagination = settingsRepository.fetchPagination(settings);

            /// Full Mode
            const starredList = await githubApiRepository.fetchUserStarred(login, pagination);
            const followers = await githubApiRepository.fetchUserFollowers(pagination);
            const following = await githubApiRepository.fetchUserFollowing(pagination);
            const repos = await githubApiRepository.fetchUserRepos(pagination);

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

async function fetchRepoData(settings, settingsRepository, githubApiRepository, simpleMode) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = settingsRepository.ownerAndRepo(settings);
            const pagination = settingsRepository.fetchPagination(settings);

            /// Simple Mode
            const runs = await githubApiRepository.fetchWorkflowRuns(owner, repo, pagination);
            const artifacts = await githubApiRepository.fetchArtifacts(owner, repo, pagination);

            if (simpleMode) {
                resolve({
                    "runs": runs,
                    "artifacts": artifacts,
                });

                return;
            }

            /// Full Mode
            const userRepo = await githubApiRepository.fetchUserRepo(owner, repo);
            const workflows = await githubApiRepository.fetchWorkflows(owner, repo, pagination);
            const stargazers = await githubApiRepository.fetchStargazers(owner, repo, pagination);
            const releases = await githubApiRepository.fetchReleases(owner, repo, pagination);
            const branches = await githubApiRepository.fetchBranches(owner, repo, pagination);
            const tags = await githubApiRepository.fetchTags(owner, repo, pagination);

            resolve({
                "runs": runs,
                "artifacts": artifacts,

                "userRepo": userRepo,
                "workflows": workflows,
                "stargazers": stargazers,
                "releases": releases,
                "branches": branches,
                "tags": tags,
            });
        } catch (error) {
            logError(error);
            resolve(null);
        }
    });
}

/// Main 3 refresh Functions ----------------------------------------------------------------------
async function stateRefresh(settings, settingsRepository, indicator, githubApiRepository) {
    try {
        indicator.refreshGithubIcon();

        const isInstalledCli = await githubApiRepository.isInstalledCli();
        if (isInstalledCli == false) {
            indicator.setState({ state: StatusBarState.NOT_INSTALLED_CLI });
            return;
        }

        const isLogged = await githubApiRepository.isLogged();
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

async function dataRefresh(settings, settingsRepository, indicator, githubApiRepository, onRepoSetAsWatched, onDeleteWorkflowRun, refreshCallback) {
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
        } = await fetchUserData(settings, settingsRepository, githubApiRepository, simpleMode);

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
            settingsRepository.updateTransfer(userObjects);
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
            tags,
        } = await fetchRepoData(settings, settingsRepository, githubApiRepository, simpleMode);

        const repoObjects = [
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        ];

        settingsRepository.updateTransfer([...userObjects, ...repoObjects]);

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
        indicator.setTags(tags);
    } catch (error) {
        logError(error);
    }
}

async function githubActionsRefresh(settings, settingsRepository, indicator, githubApiRepository, onBuildCompleted) {
    try {
        const isLogged = await githubApiRepository.isLogged();
        if (isLogged == false) {
            return;
        }

        const transferTerxt = settingsRepository.fullDataConsumptionPerHour();
        indicator.setTransferText(transferTerxt);

        if (!settingsRepository.isRepositoryEntered(settings)) {
            return;
        }

        const { owner, repo } = settingsRepository.ownerAndRepo(settings);

        const workflowRunsResponse = await githubApiRepository.fetchWorkflowRuns(owner, repo, 1);
        if (workflowRunsResponse == null) {
            indicator.setState({ state: StatusBarState.INCORRECT_REPOSITORY });
            return;
        } else if (workflowRunsResponse == 'no-internet-connection') {
            indicator.setState({ state: StatusBarState.LOGGED_NO_INTERNET_CONNECTION });
            return;
        }

        settingsRepository.updatePackageSize(workflowRunsResponse['_size_']);

        const workflowRuns = workflowRunsResponse['workflow_runs'];
        if (workflowRuns.length == 0) {
            indicator.setState({ state: StatusBarState.REPO_WITHOUT_ACTIONS });
            return;
        }

        /// Notification
        const previousState = indicator.state;
        indicator.setLatestWorkflowRun(workflowRuns[0]);
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

var ExtensionDataController = class {
    constructor(settings) {
        this.settings = settings;
        this.githubApiRepository = new GithubApiRepository(settings);
        this.settingsRepository = new SettingsRepository(settings);
    }

    fetchIsInstalledCli = async () => await this.githubApiRepository.isInstalledCli();

    fetchIsLogged = async () => await this.githubApiRepository.isLogged();

    /// Main 3 refresh Functions
    refreshState() {
        stateRefresh(
            this.settings,
            this.settingsRepository,
            this.indicator,
            this.githubApiRepository,
        );
    }

    refreshGithubActions() {
        githubActionsRefresh(
            this.settings,
            this.settingsRepository,
            this.indicator,
            this.githubApiRepository,
            (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion),
        );
    }

    refreshData() {
        dataRefresh(
            this.settings,
            this.settingsRepository,
            this.indicator,
            this.githubApiRepository,
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

            this.observeSettings(settingsRepository, indicator);
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
    observeSettings(settingsRepository, indicator) {
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

        this.settings.connect('changed::extended-colored-mode', (settings, key) => {
            const extendedColoredMode = settingsRepository.fetchExtendedColoredMode(settings);
            this.indicator.setExtendedColoredMode(extendedColoredMode);
        });
    }

    async logout(indicator) {
        const isLogged = await this.githubApiRepository.logoutUser();

        if (isLogged == true) {
            indicator.setState({ state: StatusBarState.NOT_LOGGED });
        }
    }

    async downloadArtifact({ downloadUrl, filename, onFinishCallback }) {
        const success = await this.githubApiRepository.downloadArtifactFile(downloadUrl, filename);

        onFinishCallback(success, filename);
    }

    async removeWorkflowRun(runId, runName) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo(this.settings);

            const status = await this.githubApiRepository.deleteWorkflowRun(owner, repo, runId);

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
        const extendedColoredMode = this.settingsRepository.fetchExtendedColoredMode();

        return {
            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
            "extendedColoredMode": extendedColoredMode,
        };
    }
}
