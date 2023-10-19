'use strict'

import { GithubApiRepository } from './github_api_repository.js'
import { SettingsRepository }  from './settings_repository.js'
import { StatusBarState } from './status_bar_indicator.js'

async function stateRefresh(
    indicator,
    settingsRepository,
    githubApiRepository,
) {
    try {
        if (indicator.isLongOperation()) {
            return
        }

        const isInstalledCli = await githubApiRepository.isInstalledCli()
        if (isInstalledCli == false) {
            indicator.setState({ state: StatusBarState.NOT_INSTALLED_CLI, forceUpdate: true })
            return
        }

        const isLogged = await githubApiRepository.isLogged()
        if (isLogged == false) {
            indicator.setState({ state: StatusBarState.NOT_LOGGED, forceUpdate: true })
            return
        }

        if (!settingsRepository.isRepositoryEntered()) {
            indicator.setState({ state: StatusBarState.LOGGED_NOT_CHOOSED_REPO, forceUpdate: true })
            return
        }
    } catch (error) {
        logError(error)
    }
}

async function dataRefresh(
    indicator,
    settingsRepository,
    githubApiRepository,
    onRepoSetAsWatched,
    onDeleteWorkflowRun,
    onCancelWorkflowRun,
    onRerunWorkflowRun,
    refreshCallback,
    onlyWorkflowRuns,
) {
    async function fetchUserData(
        settingsRepository,
        githubApiRepository,
    ) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await githubApiRepository.fetchUser()
                if (user == null) {
                    return
                }

                const login = user['login']

                /// Simple Mode
                const minutes = await githubApiRepository.fetchUserBillingActionsMinutes(login)
                const packages = await githubApiRepository.fetchUserBillingPackages(login)
                const sharedStorage = await githubApiRepository.fetchUserBillingSharedStorage(login)

                /// Hidden Mode
                const simpleMode = settingsRepository.fetchSimpleMode()
                const { owner, repo } = settingsRepository.ownerAndRepo()
                const isStarred = await githubApiRepository.checkIsRepoStarred(owner, repo)
                settingsRepository.updateHiddenMode(isStarred === 'success')

                if (simpleMode) {
                    resolve({
                        "user": user,
                        "minutes": minutes,
                        "packages": packages,
                        "sharedStorage": sharedStorage,
                    })

                    return
                }

                const pagination = settingsRepository.fetchPagination()

                /// Full Mode
                const starredList = await githubApiRepository.fetchUserStarred(login, pagination)
                const followers = await githubApiRepository.fetchUserFollowers(pagination)
                const following = await githubApiRepository.fetchUserFollowing(pagination)
                const repos = await githubApiRepository.fetchUserRepos(pagination)
                const gists = await githubApiRepository.fetchUserGists(pagination)
                const starredGists = await githubApiRepository.fetchUserStarredGists(pagination)

                resolve({
                    "user": user,
                    "minutes": minutes,
                    "packages": packages,
                    "sharedStorage": sharedStorage,

                    "starredList": starredList,
                    "followers": followers,
                    "following": following,
                    "repos": repos,
                    "gists": gists,
                    "starredGists": starredGists,
                })
            } catch (error) {
                logError(error)
                resolve(null)
            }
        })
    }

    async function fetchRepoData(
        settingsRepository,
        githubApiRepository,
        onlyWorkflowRuns = false,
    ) {
        return new Promise(async (resolve, reject) => {
            try {
                const { owner, repo } = settingsRepository.ownerAndRepo()
                const pagination = settingsRepository.fetchPagination()

                const runs = await githubApiRepository.fetchWorkflowRuns(owner, repo, pagination)

                if (onlyWorkflowRuns === true) {
                    resolve({ "runs": runs })
                    return
                }

                const simpleMode = settingsRepository.fetchSimpleMode()
                const artifacts = await githubApiRepository.fetchArtifacts(owner, repo, pagination)

                if (simpleMode) {
                    resolve({ "runs": runs, "artifacts": artifacts })
                    return
                }

                const userRepo = await githubApiRepository.fetchUserRepo(owner, repo)
                const workflows = await githubApiRepository.fetchWorkflows(owner, repo, pagination)
                const stargazers = await githubApiRepository.fetchStargazers(owner, repo, pagination)
                const releases = await githubApiRepository.fetchReleases(owner, repo, pagination)
                const branches = await githubApiRepository.fetchBranches(owner, repo, pagination)
                const tags = await githubApiRepository.fetchTags(owner, repo, pagination)

                resolve({
                    "runs": runs,
                    "artifacts": artifacts,

                    "userRepo": userRepo,
                    "workflows": workflows,
                    "stargazers": stargazers,
                    "releases": releases,
                    "branches": branches,
                    "tags": tags,
                })
            } catch (error) {
                logError(error)
                resolve(null)
            }
        })
    }

    try {
        if (indicator.isLongOperation()) {
            return
        }

        const newestRelease = await githubApiRepository.fetcNewestExtensionRelease()
        const newestVersion = newestRelease[0]['tag_name']
        if (newestVersion != undefined) {
            settingsRepository.updateNewestVersion(newestVersion)
        }

        if (indicator.isLogged == false) {
            return
        }

        if (onlyWorkflowRuns === true) {
            const { runs } = await fetchRepoData(settingsRepository, githubApiRepository, onlyWorkflowRuns)

            indicator.setWorkflowRuns({
                runs: runs['workflow_runs'],
                onDeleteWorkflowRun: (runId, runName) => {
                    onDeleteWorkflowRun(runId, runName)
                },
                onCancelWorkflowRun: (runId, runName) => {
                    onCancelWorkflowRun(runId, runName)
                },
                onRerunWorkflowRun: (runId, runName) => {
                    onRerunWorkflowRun(runId, runName)
                },
            })

            return
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
            gists,
            starredGists,
        } = await fetchUserData(settingsRepository, githubApiRepository)

        const userObjects = [
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            repos,
            gists,
            starredGists,
        ]

        indicator.setUser(user)
        indicator.setUserBilling(minutes, packages, sharedStorage)
        indicator.setUserStarred(starredList)
        indicator.setUserFollowers(followers)
        indicator.setUserFollowing(following)
        indicator.setUserRepos(repos, (owner, repo) => {
            onRepoSetAsWatched(owner, repo)

            settingsRepository.updateOwner(owner)
            settingsRepository.updateRepo(repo)

            refreshCallback()
        })
        indicator.setUserGists(gists)
        indicator.setUserStarredGists(starredGists)

        if (!indicator.showRepositoryMenu()) {
            settingsRepository.updateTransfer(userObjects)
            return
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
        } = await fetchRepoData(settingsRepository, githubApiRepository)

        const repoObjects = [
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
            tags,
        ]

        settingsRepository.updateTransfer([...userObjects, ...repoObjects])

        indicator.setWatchedRepo(userRepo)
        indicator.setWorkflows(workflows === undefined ? [] : workflows['workflows'])
        indicator.setArtifacts(artifacts === undefined ? [] : artifacts['artifacts'])
        indicator.setStargazers(stargazers)
        indicator.setWorkflowRuns({
            runs: runs['workflow_runs'],
            onDeleteWorkflowRun: (runId, runName) => {
                onDeleteWorkflowRun(runId, runName)
            },
            onCancelWorkflowRun: (runId, runName) => {
                onCancelWorkflowRun(runId, runName)
            },
            onRerunWorkflowRun: (runId, runName) => {
                onRerunWorkflowRun(runId, runName)
            },
        })
        indicator.setReleases(releases)
        indicator.setBranches(branches)
        indicator.setTags(tags)
    } catch (error) {
        logError(error)
    }
}

async function githubActionsRefresh(
    indicator,
    settingsRepository,
    githubApiRepository,
    onBuildCompleted,
) {
    try {
        if (indicator.isLongOperation()) {
            return
        }

        const isLogged = await githubApiRepository.isLogged()
        if (isLogged == false) {
            return
        }

        const transferTerxt = settingsRepository.fullDataConsumptionPerHour()
        indicator.setTransferText(transferTerxt)

        if (!settingsRepository.isRepositoryEntered()) {
            return
        }

        const { owner, repo } = settingsRepository.ownerAndRepo()

        const workflowRunsResponse = await githubApiRepository.fetchWorkflowRuns(owner, repo, 1)
        switch (workflowRunsResponse) {
            case null:
                indicator.setState({ state: StatusBarState.INCORRECT_REPOSITORY, forceUpdate: true })
                return
            case 'no-internet-connection':
                indicator.setState({ state: StatusBarState.LOGGED_NO_INTERNET_CONNECTION })
                return
        }

        settingsRepository.updatePackageSize(workflowRunsResponse['_size_'])

        const workflowRuns = workflowRunsResponse['workflow_runs']
        if (workflowRuns.length == 0) {
            indicator.setState({ state: StatusBarState.REPO_WITHOUT_ACTIONS, forceUpdate: true })
            return
        }

        /// Notification
        const previousState = indicator.state
        indicator.setLatestWorkflowRun(workflowRuns[0])
        const currentState = indicator.state

        if (indicator.shouldShowCompletedNotification(previousState, currentState)) {
            switch (currentState) {
                case StatusBarState.COMPLETED_SUCCESS:
                    onBuildCompleted(owner, repo, 'success')
                    break
                case StatusBarState.COMPLETED_FAILURE:
                    onBuildCompleted(owner, repo, 'failure')
                    break
                case StatusBarState.COMPLETED_CANCELLED:
                    onBuildCompleted(owner, repo, 'cancelled')
                    break
            }
        }
    } catch (error) {
        logError(error)
    }
}

export class ExtensionController {
    constructor(settings) {
        this.settings = settings
        this.githubApiRepository = new GithubApiRepository(settings)
        this.settingsRepository = new SettingsRepository(settings)
        this.isStarted = false

        this.observeSettings(this.settingsRepository)
    }

    attachCallbacks({
        onRepoSetAsWatched,
        onDeleteWorkflowRun,
        onCancelWorkflowRun,
        onRerunWorkflowRun,
        onBuildCompleted,
        onReloadCallback,
        onEnableCallback,
        onDisableCallback,
    }) {
        this.onRepoSetAsWatched = onRepoSetAsWatched
        this.onDeleteWorkflowRun = onDeleteWorkflowRun
        this.onCancelWorkflowRun = onCancelWorkflowRun
        this.onRerunWorkflowRun = onRerunWorkflowRun
        this.onBuildCompleted = onBuildCompleted
        this.onReloadCallback = onReloadCallback
        this.onEnableCallback = onEnableCallback
        this.onDisableCallback = onDisableCallback
    }

    attachIndicator(indicator) {
        this.indicator = indicator
    }

    async fetchSettings() {
        const enabledExtension = this.settingsRepository.fetchEnabledExtension()

        const {
            simpleMode,
            coloredMode,
            uppercaseMode,
            extendedColoredMode,
            iconPosition,
            showIcon,
        } = this.settingsRepository.fetchAppearanceSettings()

        const isInstalledCli = await this.githubApiRepository.isInstalledCli()
        const isLogged = await this.githubApiRepository.isLogged()
        const tokenScopes = await this.githubApiRepository.tokenScopes()

        return {
            "enabledExtension": enabledExtension,

            "isInstalledCli": isInstalledCli,
            "isLogged": isLogged,
            "tokenScopes": tokenScopes,

            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
            "extendedColoredMode": extendedColoredMode,
            "iconPosition": iconPosition,
            "showIcon": showIcon,
        }
    }

    /// Main 3 refresh Functions
    _stateRefresh() {
        stateRefresh(
            this.indicator,
            this.settingsRepository,
            this.githubApiRepository,
        )
    }

    _githubActionsRefresh() {
        githubActionsRefresh(
            this.indicator,
            this.settingsRepository,
            this.githubApiRepository,
            (owner, repo, conclusion) => this.onBuildCompleted(owner, repo, conclusion),
        )
    }

    _dataRefresh(onlyWorkflowRuns = false) {
        dataRefresh(
            this.indicator,
            this.settingsRepository,
            this.githubApiRepository,
            this.onRepoSetAsWatched,
            (runId, runName) => this.deleteWorkflowRun({ indicator: this.indicator, runId: runId, runName: runName }),
            (runId, runName) => this.cancelWorkflowRun({ indicator: this.indicator, runId: runId, runName: runName }),
            (runId, runName) => this.rerunWorkflowRun({ indicator: this.indicator, runId: runId, runName: runName }),
            () => this.refresh(),
            onlyWorkflowRuns,
        )
    }

    refresh() {
        if (this.indicator === null || this.indicator === undefined) {
            return
        }
        this.indicator.initMenu()
        try {
            this._stateRefresh()
            this._githubActionsRefresh()
            this._dataRefresh()
        } catch (error) {
            logError(error)
        }
    }

    startRefreshing() {
        if (this.isStarted === true) {
            return
        }
        this.isStarted = true

        try {
            const settingsRepository = this.settingsRepository
            this.refresh()

            this.stateRefreshInterval = setInterval(() => this._stateRefresh(), 1 * 1000)
            this.githubActionsRefreshInterval = setInterval(() => this._githubActionsRefresh(), settingsRepository.fetchRefreshTime() * 1000)
            this.dataRefreshInterval = setInterval(() => this._dataRefresh(), settingsRepository.fetchRefreshFullUpdateTime() * 60 * 1000)
        } catch (error) {
            logError(error)
        }
    }

    stopRefreshing() {
        if (this.isStarted === false) {
            return
        }
        this.isStarted = false

        clearInterval(this.stateRefreshInterval)
        this.stateRefreshInterval = null

        clearInterval(this.githubActionsRefreshInterval)
        this.githubActionsRefreshInterval = null

        clearInterval(this.dataRefreshInterval)
        this.dataRefreshInterval = null
    }

    observeSettings(settingsRepository) {
        this.settings.connect('changed::refresh-time', (settings, key) => {
            const enabled = settingsRepository.fetchEnabledExtension()

            if (enabled) {
                this.stopRefreshing()
                this.startRefreshing()
            }
        })

        this.settings.connect('changed::full-refresh-time', (settings, key) => {
            const enabled = settingsRepository.fetchEnabledExtension()

            if (enabled) {
                this.stopRefreshing()
                this.startRefreshing()
            }
        })

        this.settings.connect('changed::simple-mode', (settings, key) => {
            const simpleMode = settingsRepository.fetchSimpleMode()
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setSimpleMode(simpleMode)
            }
        })

        this.settings.connect('changed::colored-mode', (settings, key) => {
            const coloredMode = settingsRepository.fetchColoredMode()
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setColoredMode(coloredMode)
            }
        })

        this.settings.connect('changed::uppercase-mode', (settings, key) => {
            const uppercaseMode = settingsRepository.fetchUppercaseMode()
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setUppercaseMode(uppercaseMode)
            }
        })

        this.settings.connect('changed::extended-colored-mode', (settings, key) => {
            const extendedColoredMode = settingsRepository.fetchExtendedColoredMode()
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setExtendedColoredMode(extendedColoredMode)
            }
        })

        this.settings.connect('changed::show-icon', (settings, key) => {
            const enabled = settingsRepository.fetchEnabledExtension()

            if (enabled) {
                this.onReloadCallback()
            }
        })

        this.settings.connect('changed::icon-position', (settings, key) => {
            const enabled = settingsRepository.fetchEnabledExtension()

            if (enabled) {
                this.onReloadCallback()
            }
        })

        this.settings.connect('changed::extension-enabled', (settings, key) => {
            const enabled = settingsRepository.fetchEnabledExtension()

            if (enabled) {
                this.startRefreshing()
                this.onEnableCallback()
            } else {
                this.stopRefreshing()
                this.onDisableCallback()
            }
        })
    }

    async logout() {
        await this.githubApiRepository.logoutUser()
    }

    async fetchToken() {
        return await this.githubApiRepository.token()
    }

    async downloadArtifact({ indicator, downloadUrl, filename, onFinishCallback }) {
        try {
            const state = indicator.getState()
            indicator.setState({ state: StatusBarState.LONG_OPERATION_PLEASE_WAIT })
            const success = await this.githubApiRepository.downloadArtifactFile(downloadUrl, filename)
            indicator.setState({ state: state })

            onFinishCallback(success, filename)
        } catch (error) {
            logError(error)
        }
    }

    async deleteWorkflowRun({ indicator, runId, runName }) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo()

            const state = indicator.getState()
            indicator.setState({ state: StatusBarState.LONG_OPERATION_PLEASE_WAIT })
            const status = await this.githubApiRepository.deleteWorkflowRun(owner, repo, runId)
            indicator.setState({ state: state })

            if (status == 'success') {
                this.onDeleteWorkflowRun(true, runName)
                this._dataRefresh(true)
            } else {
                this.onDeleteWorkflowRun(false, runName)
            }
        } catch (error) {
            logError(error)
        }
    }

    async cancelWorkflowRun({ indicator, runId, runName }) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo()

            const state = indicator.getState()
            indicator.setState({ state: StatusBarState.LONG_OPERATION_PLEASE_WAIT })
            const status = await this.githubApiRepository.cancelWorkflowRun(owner, repo, runId)
            indicator.setState({ state: state })

            if (status == 'success') {
                this.onCancelWorkflowRun(true, runName)
                this._dataRefresh(true)
            } else {
                this.onCancelWorkflowRun(false, runName)
            }
        } catch (error) {
            logError(error)
        }
    }

    async rerunWorkflowRun({ indicator, runId, runName }) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo()

            const state = indicator.getState()
            indicator.setState({ state: StatusBarState.LONG_OPERATION_PLEASE_WAIT })
            const status = await this.githubApiRepository.rerunWorkflowRun(owner, repo, runId)
            indicator.setState({ state: state })

            if (status == 'success') {
                this.onRerunWorkflowRun(true, runName)
                this._dataRefresh(true)
            } else {
                this.onRerunWorkflowRun(false, runName)
            }
        } catch (error) {
            logError(error)
        }
    }
}
