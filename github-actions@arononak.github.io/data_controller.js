const { GObject } = imports.gi;
const Main = imports.ui.main;

const GETTEXT_DOMAIN = 'github-actions-extension';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

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
} = Me.imports.utils;

const {
    logoutUser,
    downloadArtifactFile,
    isInstalledCli,
    isLogged,
    fetchUser,
    fetchUserBillingActionsMinutes,
    fetchUserBillingPackages,
    fetchUserBillingSharedStorage,
    fetchUserStarred,
    fetchUserFollowers,
    fetchUserFollowing,
    fetchUserRepos,
    fetchWorkflows,
    fetchArtifacts,
    fetchStargazers,
    fetchWorkflowRuns,
    fetchReleases,
    fetchBranches,
    fetchUserRepo,
    deleteWorkflowRun,
} = Me.imports.data_repository;

const { StatusBarState } = Me.imports.status_bar_indicator;

async function stateRefresh(settings, indicator) {
    try {
        indicator.refreshBoredIcon();

        const _isInstalledCli = await isInstalledCli();
        if (_isInstalledCli == false) {
            indicator.setState({ state: StatusBarState.NOT_INSTALLED_CLI });
            return;
        }

        const _isLogged = await isLogged();
        if (_isLogged == false) {
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

async function fetchUserData(settings) {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await fetchUser();

            const pagination = fetchPagination(settings);
            const login = user['login'];

            const minutes = await fetchUserBillingActionsMinutes(login);
            const packages = await fetchUserBillingPackages(login);
            const sharedStorage = await fetchUserBillingSharedStorage(login);
            const starredList = await fetchUserStarred(login, pagination);
            const followers = await fetchUserFollowers(pagination);
            const following = await fetchUserFollowing(pagination);
            const repos = await fetchUserRepos(pagination);

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

async function fetchRepoData(settings) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = ownerAndRepo(settings);
            const pagination = fetchPagination(settings);

            const userRepo = await fetchUserRepo(owner, repo);
            const workflows = await fetchWorkflows(owner, repo, pagination);
            const artifacts = await fetchArtifacts(owner, repo, pagination);
            const stargazers = await fetchStargazers(owner, repo, pagination);
            const runs = await fetchWorkflowRuns(owner, repo, pagination);
            const releases = await fetchReleases(owner, repo, pagination);
            const branches = await fetchBranches(owner, repo, pagination);

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

/// Assistant of githubActionsRefresh()
async function dataRefresh(settings, indicator, onRepoSetAsWatched, onDeleteWorkflowRun, refreshCallback) {
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
        } = await fetchUserData(settings);

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
        } = await fetchRepoData(settings);

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

async function githubActionsRefresh(settings, indicator, onBuildCompleted) {
    try {
        const _isLogged = await isLogged();
        if (_isLogged == false) {
            return;
        }

        indicator.refreshTransfer(settings);

        if (!isRepositoryEntered(settings)) {
            return;
        }

        const { owner, repo } = ownerAndRepo(settings);
        const run = await fetchWorkflowRuns(owner, repo, 1);
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
    }

    fetchIsInstalledCli = async () => await isInstalledCli();

    fetchIsLogged = async () => await isLogged();

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

            this.stateRefreshInterval = setInterval(
                () => stateRefresh(this.settings, this.indicator),
                stateRefreshTime,
            );

            this.githubActionsRefreshInterval = setInterval(
                () => githubActionsRefresh(
                    this.settings,
                    this.indicator,
                    (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion),
                ),
                githubActionsRefreshTime,
            );

            this.dataRefreshInterval = setInterval(
                () => dataRefresh(
                    this.settings,
                    this.indicator,
                    this.onRepoSetAsWatched,
                    (runId, runName) => this.removeWorkflowRun(runId, runName),
                    this.refresh,
                ),
                dataRefreshTime,
            );

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

    refresh() {
        try {
            stateRefresh(this.settings, this.indicator);
            githubActionsRefresh(this.settings, this.indicator, (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion));
            dataRefresh(this.settings, this.indicator, this.onRepoSetAsWatched, (runId, runName) => this.removeWorkflowRun(runId, runName), this.refresh);
        } catch (error) {
            logError(error);
        }
    }

    async logout() {
        const isLogged = await logout();

        if (isLogged == true) {
            indicator.setState({ state: StatusBarState.NOT_LOGGED });
        }
    }

    async downloadArtifact({ downloadUrl, filename, onFinishCallback }) {
        const success = await downloadArtifactFile(downloadUrl, filename);

        onFinishCallback(success, filename);
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

    async removeWorkflowRun(runId, runName) {
        try {
            const { owner, repo } = ownerAndRepo(this.settings);

            const status = await deleteWorkflowRun(owner, repo, runId);

            if (status == 'success') {
                this.onDeleteWorkflowRun(true, runName);
                dataRefresh(this.settings, this.indicator, this.onRepoSetAsWatched, (runId, runName) => this.removeWorkflowRun(runId, runName), this.refresh);
            } else {
                this.onDeleteWorkflowRun(false, runName);
            }
        } catch (error) {
            logError(error);
        }
    }
}
