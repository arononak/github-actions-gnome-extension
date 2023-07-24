const { GObject } = imports.gi;
const Main = imports.ui.main;

const GETTEXT_DOMAIN = 'github-actions-extension';

const extension = imports.misc.extensionUtils.getCurrentExtension();

const {
    isRepositoryEntered,
    fetchPagination,
    fetchUppercaseMode,
    fetchSimpleMode,
    fetchColoredMode,
    updateColdPackageSize,
    updatePackageSize,
    updateOwner,
    updateRepo,
    ownerAndRepo,
    fetchRefreshTime,
    fetchRefreshFullUpdateTime,
    updateTransfer,
} = extension.imports.app.utils;

const { DataRepository } = extension.imports.app.data_repository;
const { StatusBarState } = extension.imports.app.status_bar_indicator;

async function fetchUserData(settings, dataRepository) {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await dataRepository.fetchUser();

            const pagination = fetchPagination(settings);
            const login = user['login'];

            const minutes = await dataRepository.fetchUserBillingActionsMinutes(login);
            const packages = await dataRepository.fetchUserBillingPackages(login);
            const sharedStorage = await dataRepository.fetchUserBillingSharedStorage(login);
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

async function fetchRepoData(settings, dataRepository) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = ownerAndRepo(settings);
            const pagination = fetchPagination(settings);

            const userRepo = await dataRepository.fetchUserRepo(owner, repo);
            const workflows = await dataRepository.fetchWorkflows(owner, repo, pagination);
            const artifacts = await dataRepository.fetchArtifacts(owner, repo, pagination);
            const stargazers = await dataRepository.fetchStargazers(owner, repo, pagination);
            const runs = await dataRepository.fetchWorkflowRuns(owner, repo, pagination);
            const releases = await dataRepository.fetchReleases(owner, repo, pagination);
            const branches = await dataRepository.fetchBranches(owner, repo, pagination);

            resolve({
                "userRepo": userRepo,
                "workflows": workflows,
                "artifacts": artifacts,
                "stargazers": stargazers,
                "runs": runs,
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
async function stateRefresh(settings, indicator, dataRepository) {
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

        if (!isRepositoryEntered(settings)) {
            indicator.setState({ state: StatusBarState.LOGGED_NOT_CHOOSED_REPO });
            return;
        }
    } catch (error) {
        logError(error);
    }
}

async function dataRefresh(settings, indicator, dataRepository, onRepoSetAsWatched, onDeleteWorkflowRun, refreshCallback) {
    try {
        if (indicator.isLogged == false) {
            return;
        }

        const {
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            repos,
        } = await fetchUserData(settings, dataRepository);

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

            updateOwner(settings, owner);
            updateRepo(settings, repo);

            refreshCallback();
        });

        if (!indicator.isCorrectState()) {
            updateTransfer(settings, userObjects);
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
        } = await fetchRepoData(settings, dataRepository);

        const repoObjects = [
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        ];

        updateTransfer(settings, [...userObjects, ...repoObjects]);

        indicator.setWatchedRepo(userRepo);
        indicator.setWorkflows(workflows['workflows']);
        indicator.setArtifacts(artifacts['artifacts']);
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

async function githubActionsRefresh(settings, indicator, dataRepository, onBuildCompleted) {
    try {
        const isLogged = await dataRepository.isLogged();
        if (isLogged == false) {
            return;
        }

        indicator.refreshTransfer(settings);

        if (!isRepositoryEntered(settings)) {
            return;
        }

        const { owner, repo } = ownerAndRepo(settings);
        const run = await dataRepository.fetchWorkflowRuns(owner, repo, 1);
        if (run == null) {
            indicator.setState({ state: StatusBarState.INCORRECT_REPOSITORY });
            return;
        }

        updatePackageSize(settings, run['_size_']);

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
        this.dataRepository = new DataRepository();
    }

    fetchIsInstalledCli = async () => await this.dataRepository.isInstalledCli();

    fetchIsLogged = async () => await this.dataRepository.isLogged();

    /// Main 3 refresh Functions
    refreshState() {
        stateRefresh(this.settings, this.indicator, this.dataRepository);
    }

    refreshGithubActions() {
        githubActionsRefresh(
            this.settings,
            this.indicator,
            this.dataRepository,
            (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion),
        );
    }

    refreshData() {
        dataRefresh(
            this.settings,
            this.indicator,
            this.dataRepository,
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

        try {
            const stateRefreshTime = 1 * 1000;
            const githubActionsRefreshTime = fetchRefreshTime(this.settings) * 1000;
            const dataRefreshTime = fetchRefreshFullUpdateTime(this.settings) * 60 * 1000;

            this.stateRefreshInterval = setInterval(() => this.refreshState(), stateRefreshTime);
            this.githubActionsRefreshInterval = setInterval(() => this.refreshGithubActions(), githubActionsRefreshTime);
            this.dataRefreshInterval = setInterval(() => this.refreshData(), dataRefreshTime);

            this.observeSettings();
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
    observeSettings() {
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
            const simpleMode = fetchSimpleMode(settings);
            this.indicator.setSimpleMode(simpleMode);
        });

        this.settings.connect('changed::colored-mode', (settings, key) => {
            const coloredMode = fetchColoredMode(settings);
            this.indicator.setColoredMode(coloredMode);
        });

        this.settings.connect('changed::uppercase-mode', (settings, key) => {
            const uppercaseMode = fetchUppercaseMode(settings);
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
            const { owner, repo } = ownerAndRepo(this.settings);

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
        const simpleMode = fetchSimpleMode(this.settings);
        const coloredMode = fetchColoredMode(this.settings);
        const uppercaseMode = fetchUppercaseMode(this.settings);

        return {
            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
        };
    }
}
