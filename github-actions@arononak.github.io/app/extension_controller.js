const { GObject } = imports.gi;
const Main = imports.ui.main;
const GETTEXT_DOMAIN = 'github-actions-extension';

const extension = imports.misc.extensionUtils.getCurrentExtension();

const { GithubApiRepository } = extension.imports.app.github_api_repository;
const { SettingsRepository } = extension.imports.app.settings_repository;
const { StatusBarState } = extension.imports.app.status_bar_indicator;

async function fetchUserData(
    settingsRepository,
    githubApiRepository,
) {
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
            const simpleMode = settingsRepository.fetchSimpleMode();
            const { owner, repo } = settingsRepository.ownerAndRepo();
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

            const pagination = settingsRepository.fetchPagination();

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

async function fetchRepoData(
    settingsRepository,
    githubApiRepository,
) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = settingsRepository.ownerAndRepo();
            const pagination = settingsRepository.fetchPagination();
            const simpleMode = settingsRepository.fetchSimpleMode();

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
async function stateRefresh(
    indicator,
    settingsRepository,
    githubApiRepository,
) {
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

        if (!settingsRepository.isRepositoryEntered()) {
            indicator.setState({ state: StatusBarState.LOGGED_NOT_CHOOSED_REPO });
            return;
        }
    } catch (error) {
        logError(error);
    }
}

async function dataRefresh(
    indicator,
    settingsRepository,
    githubApiRepository,
    onRepoSetAsWatched,
    onDeleteWorkflowRun,
    onCancelWorkflowRun,
    refreshCallback,
) {
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
        } = await fetchUserData(settingsRepository, githubApiRepository);

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

            settingsRepository.updateOwner(owner);
            settingsRepository.updateRepo(repo);

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
        } = await fetchRepoData(settingsRepository, githubApiRepository);

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
            onDeleteWorkflowRun: (runId, runName) => {
                onDeleteWorkflowRun(runId, runName);
            },
            onCancelWorkflowRun: (runId, runName) => {
                onCancelWorkflowRun(runId, runName);
            },
        });
        indicator.setReleases(releases);
        indicator.setBranches(branches);
        indicator.setTags(tags);
    } catch (error) {
        logError(error);
    }
}

async function githubActionsRefresh(
    indicator,
    settingsRepository,
    githubApiRepository,
    onBuildCompleted,
) {
    try {
        const isLogged = await githubApiRepository.isLogged();
        if (isLogged == false) {
            return;
        }

        const transferTerxt = settingsRepository.fullDataConsumptionPerHour();
        indicator.setTransferText(transferTerxt);

        if (!settingsRepository.isRepositoryEntered()) {
            return;
        }

        const { owner, repo } = settingsRepository.ownerAndRepo();

        const workflowRunsResponse = await githubApiRepository.fetchWorkflowRuns(owner, repo, 1);
        switch (workflowRunsResponse) {
            case null:
                indicator.setState({ state: StatusBarState.INCORRECT_REPOSITORY });
                return;
            case 'no-internet-connection':
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

var ExtensionController = class {
    constructor(settings) {
        this.settings = settings;
        this.githubApiRepository = new GithubApiRepository(settings);
        this.settingsRepository = new SettingsRepository(settings);
    }

    async fetchSettings() {
        const {
            simpleMode,
            coloredMode,
            uppercaseMode,
            extendedColoredMode,
            iconPosition,
        } = this.settingsRepository.fetchAppearanceSettings();

        const isInstalledCli = await this.githubApiRepository.isInstalledCli();
        const isLogged = await this.githubApiRepository.isLogged();
        const tokenScopes = await this.githubApiRepository.tokenScopes();

        return {
            "isInstalledCli": isInstalledCli,
            "isLogged": isLogged,
            "tokenScopes": tokenScopes,

            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
            "extendedColoredMode": extendedColoredMode,
            "iconPosition": iconPosition,
        };
    }

    /// Main 3 refresh Functions
    _stateRefresh() {
        stateRefresh(
            this.indicator,
            this.settingsRepository,
            this.githubApiRepository,
        );
    }

    _githubActionsRefresh() {
        githubActionsRefresh(
            this.indicator,
            this.settingsRepository,
            this.githubApiRepository,
            (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion),
        );
    }

    _dataRefresh() {
        dataRefresh(
            this.indicator,
            this.settingsRepository,
            this.githubApiRepository,
            this.onRepoSetAsWatched,
            (runId, runName) => this.deleteWorkflowRun(runId, runName),
            (runId, runName) => this.cancelWorkflowRun(runId, runName),
            () => this.refresh(),
        );
    }

    refresh() {
        try {
            this._stateRefresh();
            this._githubActionsRefresh();
            this._dataRefresh();
        } catch (error) {
            logError(error);
        }
    }

    /// Start / Stop
    startRefreshing({
        indicator,
        onRepoSetAsWatched,
        onDeleteWorkflowRun,
        onCancelWorkflowRun,
        onBuildCompleted,
        onReloadCallback,
    }) {
        this.indicator = indicator;
        this.onRepoSetAsWatched = onRepoSetAsWatched;
        this.onDeleteWorkflowRun = onDeleteWorkflowRun;
        this.onCancelWorkflowRun = onCancelWorkflowRun;
        this.onBuildCompleted = onBuildCompleted;

        const settingsRepository = this.settingsRepository;

        try {
            const stateRefreshTime = 1 * 1000;
            const githubActionsRefreshTime = settingsRepository.fetchRefreshTime() * 1000;
            const dataRefreshTime = settingsRepository.fetchRefreshFullUpdateTime() * 60 * 1000;

            this.stateRefreshInterval = setInterval(() => this._stateRefresh(), stateRefreshTime);
            this.githubActionsRefreshInterval = setInterval(() => this._githubActionsRefresh(), githubActionsRefreshTime);
            this.dataRefreshInterval = setInterval(() => this._dataRefresh(), dataRefreshTime);

            this.observeSettings(indicator, settingsRepository, onReloadCallback);
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
    observeSettings(indicator, settingsRepository, onReloadCallback) {
        this.settings.connect('changed::refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing({
                indicator: indicator,
                onRepoSetAsWatched: onRepoSetAsWatched,
                onDeleteWorkflowRun: onDeleteWorkflowRun,
                onCancelWorkflowRun: onCancelWorkflowRun,
                onBuildCompleted: onBuildCompleted,
            });
        });

        this.settings.connect('changed::full-refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing({
                indicator: indicator,
                onRepoSetAsWatched: onRepoSetAsWatched,
                onDeleteWorkflowRun: onDeleteWorkflowRun,
                onCancelWorkflowRun: onCancelWorkflowRun,
                onBuildCompleted: onBuildCompleted,
            });
        });

        this.settings.connect('changed::simple-mode', (settings, key) => {
            const simpleMode = settingsRepository.fetchSimpleMode();
            this.indicator.setSimpleMode(simpleMode);
        });

        this.settings.connect('changed::colored-mode', (settings, key) => {
            const coloredMode = settingsRepository.fetchColoredMode();
            this.indicator.setColoredMode(coloredMode);
        });

        this.settings.connect('changed::uppercase-mode', (settings, key) => {
            const uppercaseMode = settingsRepository.fetchUppercaseMode();
            this.indicator.setUppercaseMode(uppercaseMode);
        });

        this.settings.connect('changed::extended-colored-mode', (settings, key) => {
            const extendedColoredMode = settingsRepository.fetchExtendedColoredMode();
            this.indicator.setExtendedColoredMode(extendedColoredMode);
        });

        this.settings.connect('changed::icon-position', (settings, key) => {
            onReloadCallback();
        });
    }

    async logout() {
        await this.githubApiRepository.logoutUser();
    }

    async downloadArtifact({ downloadUrl, filename, onFinishCallback }) {
        const success = await this.githubApiRepository.downloadArtifactFile(downloadUrl, filename);

        onFinishCallback(success, filename);
    }

    async deleteWorkflowRun(runId, runName) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo();

            const status = await this.githubApiRepository.deleteWorkflowRun(owner, repo, runId);

            if (status == 'success') {
                this.onDeleteWorkflowRun(true, runName);
                this._dataRefresh();
            } else {
                this.onDeleteWorkflowRun(false, runName);
            }
        } catch (error) {
            logError(error);
        }
    }

    async cancelWorkflowRun(runId, runName) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo();

            const status = await this.githubApiRepository.cancelWorkflowRun(owner, repo, runId);

            if (status == 'success') {
                this.onCancelWorkflowRun(true, runName);
                this._dataRefresh();
            } else {
                this.onCancelWorkflowRun(false, runName);
            }
        } catch (error) {
            logError(error);
        }
    }
}
