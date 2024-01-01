'use strict'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { ExtensionRepository, DataTypeEnum } from './extension_repository.js'
import { SettingsRepository } from './settings_repository.js'
import { copyToClipboard } from './extension_utils.js'
import { AppStatusColor } from './widgets.js'

export const ExtensionState = {
    NOT_INSTALLED_CLI: {
        text: () => `Not installed CLI`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    NOT_LOGGED: {
        text: () => `Not logged in`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    LOGGED_NO_INTERNET_CONNECTION: {
        text: () => `No internet connection`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    LOADING: {
        text: () => `Loading`,
        simpleModeShowText: false,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.BLUE,
    },
    LOGGED_NOT_CHOOSED_REPO: {
        text: () => `No repo entered`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    INCORRECT_REPOSITORY: {
        text: () => `Incorrect repository`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    REPO_WITHOUT_ACTIONS: {
        text: () => `Repo without actions`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    IN_PROGRESS: {
        text: () => `In progress`,
        simpleModeShowText: false,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.BLUE,
    },
    COMPLETED_CANCELLED: {
        text: () => `Cancelled`,
        simpleModeShowText: false,
        color: AppStatusColor.RED,
        coloredModeColor: AppStatusColor.RED,
    },
    COMPLETED_FAILURE: {
        text: () => `Failure`,
        simpleModeShowText: false,
        color: AppStatusColor.RED,
        coloredModeColor: AppStatusColor.RED,
    },
    COMPLETED_SUCCESS: {
        text: () => `Success`,
        simpleModeShowText: false,
        color: AppStatusColor.WHITE,
        coloredModeColor: AppStatusColor.GREEN,
    },
    LONG_OPERATION_PLEASE_WAIT: {
        text: () => `Please wait...`,
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
}

export class ExtensionController {
    constructor(settings) {
        this.settings = settings
        this.settingsRepository = new SettingsRepository(settings)
        this.extensionRepository = new ExtensionRepository()

        this.isStarted = false
    }

    async logout() {
        await this.extensionRepository.logoutUser()
    }

    hasRepository = () => this.settingsRepository.hasRepository()

    async copyTokenToClipboard() {
        const token = await this.extensionRepository.fetchToken()

        copyToClipboard(token)
        Main.notify(`Copied !`, token)
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

        const isInstalledCli = await this.extensionRepository.isInstalledCli()
        const isLogged = await this.extensionRepository.isLogged()
        const tokenScopes = await this.extensionRepository.tokenScopes()

        const {
            simpleMode,
            coloredMode,
            uppercaseMode,
            extendedColoredMode,
            iconPositionBox,
            iconPosition,
            showIcon,
            textLengthLimiter,
        } = this.settingsRepository.fetchAppearanceSettings()

        return {
            enabledExtension,

            isInstalledCli,
            isLogged,
            tokenScopes,

            simpleMode,
            coloredMode,
            uppercaseMode,
            extendedColoredMode,
            iconPositionBox,
            iconPosition,
            showIcon,
            textLengthLimiter
        }
    }

    refresh() {
        if (this.indicator === null || this.indicator === undefined) {
            return
        }

        this.indicator.initMenu()

        try {
            this._checkErrors()
            this._fetchStatus()
            this._fetchData()
        } catch (error) {
            logError(error)
        }
    }

    startRefreshing() {
        if (this.isStarted === true) {
            return
        }

        this.isStarted = true

        this.observeSettings(this.settingsRepository)

        try {
            const settingsRepository = this.settingsRepository
            this.refresh()

            this.stateRefreshInterval = setInterval(() => this._checkErrors(), 1 * 1000)
            this.githubActionsRefreshInterval = setInterval(() => this._fetchStatus(), settingsRepository.fetchRefreshTime() * 1000)
            this.dataRefreshInterval = setInterval(() => this._fetchData(), settingsRepository.fetchRefreshFullUpdateTime() * 60 * 1000)
        } catch (error) {
            logError(error)
        }
    }

    stopRefreshing() {
        if (this.isStarted === false) {
            return
        }

        this.isStarted = false

        this.disconnectSettings(this.settingsRepository)

        clearInterval(this.stateRefreshInterval)
        this.stateRefreshInterval = null

        clearInterval(this.githubActionsRefreshInterval)
        this.githubActionsRefreshInterval = null

        clearInterval(this.dataRefreshInterval)
        this.dataRefreshInterval = null
    }

    observeSettings(settingsRepository) {
        this.settings.connect(`changed::extension-enabled`, () => this.extensionSwitchOn())

        this.settings.connect(`changed::refresh-time`, () => this.restartExtension())
        this.settings.connect(`changed::full-refresh-time`, () => this.restartExtension())
        this.settings.connect(`changed::locale`, () => this.reloadExtension())
        this.settings.connect(`changed::show-icon`, () => this.reloadExtension())
        this.settings.connect(`changed::icon-position-box`, () => this.reloadExtension())
        this.settings.connect(`changed::icon-position`, () => this.reloadExtension())

        this.settings.connect(`changed::simple-mode`, () => {
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setSimpleMode(settingsRepository.fetchSimpleMode())
            }
        })

        this.settings.connect(`changed::colored-mode`, () => {
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setColoredMode(settingsRepository.fetchColoredMode())
            }
        })

        this.settings.connect(`changed::uppercase-mode`, () => {
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setUppercaseMode(settingsRepository.fetchUppercaseMode())
            }
        })

        this.settings.connect(`changed::extended-colored-mode`, () => {
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setExtendedColoredMode(settingsRepository.fetchExtendedColoredMode())
            }
        })

        this.settings.connect(`changed::text-length-limiter`, () => {
            if (this.indicator != null && this.indicator != undefined) {
                this.indicator.setTextLengthLimiter(settingsRepository.fetchTextLengthLimiter())
            }
        })
    }

    disconnectSettings() {
        this.settings.disconnect(`changed::extension-enabled`)

        this.settings.disconnect(`changed::refresh-time`)
        this.settings.disconnect(`changed::full-refresh-time`)
        this.settings.disconnect(`changed::locale`)
        this.settings.disconnect(`changed::show-icon`)
        this.settings.disconnect(`changed::icon-position-box`)
        this.settings.disconnect(`changed::icon-position`)

        this.settings.disconnect(`changed::simple-mode`)
        this.settings.disconnect(`changed::colored-mode`)
        this.settings.disconnect(`changed::uppercase-mode`)
        this.settings.disconnect(`changed::extended-colored-mode`)
        this.settings.disconnect(`changed::text-length-limiter`)
    }

    restartExtension() {
        const enabled = this.settingsRepository.fetchEnabledExtension()

        if (enabled) {
            this.stopRefreshing()
            this.startRefreshing()
        }
    }

    reloadExtension() {
        const enabled = this.settingsRepository.fetchEnabledExtension()

        if (enabled) {
            this.onReloadCallback()
        }
    }

    extensionSwitchOn() {
        const enabled = this.settingsRepository.fetchEnabledExtension()

        if (enabled) {
            this.startRefreshing()
            this.onEnableCallback()
        } else {
            this.stopRefreshing()
            this.onDisableCallback()
        }
    }

    async downloadArtifact({ indicator, downloadUrl, filename, onFinishCallback }) {
        try {
            const state = indicator.getState()
            indicator.setState({ state: ExtensionState.LONG_OPERATION_PLEASE_WAIT })
            const success = await this.extensionRepository.downloadArtifactFile(downloadUrl, filename)
            indicator.setState({ state })

            onFinishCallback(success, filename)
        } catch (error) {
            logError(error)
        }
    }

    async deleteWorkflowRun({ indicator, runId, runName }) {
        try {
            const { owner, repo } = this.settingsRepository.ownerAndRepo()

            const state = indicator.getState()
            indicator.setState({ state: ExtensionState.LONG_OPERATION_PLEASE_WAIT })
            const status = await this.extensionRepository.deleteWorkflowRun(owner, repo, runId)
            indicator.setState({ state })

            if (status == `success`) {
                this.onDeleteWorkflowRun(true, runName)
                this._fetchData(true)
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
            indicator.setState({ state: ExtensionState.LONG_OPERATION_PLEASE_WAIT })
            const status = await this.extensionRepository.cancelWorkflowRun(owner, repo, runId)
            indicator.setState({ state })

            if (status == `success`) {
                this.onCancelWorkflowRun(true, runName)
                this._fetchData(true)
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
            indicator.setState({ state: ExtensionState.LONG_OPERATION_PLEASE_WAIT })
            const status = await this.extensionRepository.rerunWorkflowRun(owner, repo, runId)
            indicator.setState({ state })

            if (status == `success`) {
                this.onRerunWorkflowRun(true, runName)
                this._fetchData(true)
            } else {
                this.onRerunWorkflowRun(false, runName)
            }
        } catch (error) {
            logError(error)
        }
    }

    _checkErrors() {
        if (this.indicator == undefined) {
            return
        }

        if (this.indicator.isLongOperation()) {
            return
        }

        if (!this.hasRepository()) {
            this.indicator.setState({ state: ExtensionState.LOGGED_NOT_CHOOSED_REPO, forceUpdate: true })
            return
        }

        this.extensionRepository.checkErrors({
            onNotInstalledCli: () => {
                this.indicator.setState({ state: ExtensionState.NOT_INSTALLED_CLI, forceUpdate: true })
            },
            onNotLogged: () => {
                this.indicator.setState({ state: ExtensionState.NOT_LOGGED, forceUpdate: true })
            },
            onSuccess: () => {
                if (this.indicator.state !== ExtensionState.LOGGED_NO_INTERNET_CONNECTION) {
                    const transferText = this.settingsRepository.fullDataConsumptionPerHour()
                    this.indicator.setTransferText(transferText)
                    this.indicator.refreshGithubIcon()
                }
            },
        })
    }

    _fetchStatus() {
        if (this.indicator == undefined) {
            return
        }

        if (this.indicator.isLongOperation()) {
            return
        }

        if (!this.hasRepository()) {
            return
        }

        const { owner, repo } = this.settingsRepository.ownerAndRepo()

        this.extensionRepository.fetchStatus({
            owner,
            repo,
            onNoInternet: () => {
                this.indicator.setState({ state: ExtensionState.LOGGED_NO_INTERNET_CONNECTION })
            },
            onIncorrectRepository: () => {
                this.indicator.setState({ state: ExtensionState.INCORRECT_REPOSITORY, forceUpdate: true })
            },
            onDownloadPackageSize: (size) => {
                this.settingsRepository.updatePackageSize(size)
            },
            onRepoWithoutActions: () => {
                this.indicator.setState({ state: ExtensionState.REPO_WITHOUT_ACTIONS, forceUpdate: true })
            },
            onCompleted: (run) => {
                const previousState = this.indicator.state
                this.indicator.setLatestWorkflowRun(run)
                const currentState = this.indicator.state

                if (this.indicator.shouldShowCompletedNotification(previousState, currentState)) {
                    switch (currentState) {
                        case ExtensionState.COMPLETED_SUCCESS:
                            this.onBuildCompleted(owner, repo, `success`)
                            break
                        case ExtensionState.COMPLETED_FAILURE:
                            this.onBuildCompleted(owner, repo, `failure`)
                            break
                        case ExtensionState.COMPLETED_CANCELLED:
                            this.onBuildCompleted(owner, repo, `cancelled`)
                            break
                    }
                }
            },
        })
    }

    async _fetchData(onlyWorkflowRuns = false) {
        if (this.indicator == undefined) {
            return
        }

        if (this.indicator.isLongOperation()) {
            return
        }

        const repositoryEntered = this.hasRepository()

        let type
        if (onlyWorkflowRuns === true) {
            type = DataTypeEnum.ONLY_RUNS
        } else if (repositoryEntered === true) {
            type = DataTypeEnum.FULL
        } else {
            type = DataTypeEnum.ONLY_USER
        }

        const tokenScopes = await this.extensionRepository.tokenScopes()
        if (!this.indicator.tokenScopes.isEqual(tokenScopes)) {
            this.indicator.tokenScopes = tokenScopes

            this.indicator.initMenu()
        }

        this.extensionRepository.fetchData({
            type,
            settingsRepository: this.settingsRepository,
            onUserDownloaded: (userObject) => {
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
                } = userObject

                this.indicator.setUser(user)
                this.indicator.setUserBilling(minutes, packages, sharedStorage)
                this.indicator.setUserStarred(starredList)
                this.indicator.setUserFollowers(followers)
                this.indicator.setUserFollowing(following)
                this.indicator.setUserGists(gists)
                this.indicator.setUserStarredGists(starredGists)
                this.indicator.setUserRepos(repos, (owner, repo) => {
                    this.onRepoSetAsWatched(owner, repo)

                    this.settingsRepository.updateOwner(owner)
                    this.settingsRepository.updateRepo(repo)

                    this.refresh()
                })
            },
            onRunsDownloaded: (runs) => {
                this.indicator.setWorkflowRuns({
                    runs,
                    onDeleteWorkflowRun: (runId, runName) => {
                        this.deleteWorkflowRun({ indicator: this.indicator, runId, runName })
                    },
                    onCancelWorkflowRun: (runId, runName) => {
                        this.cancelWorkflowRun({ indicator: this.indicator, runId, runName })
                    },
                    onRerunWorkflowRun: (runId, runName) => {
                        this.rerunWorkflowRun({ indicator: this.indicator, runId, runName })
                    },
                })
            },
            onRepoDownloaded: (repoObject) => {
                const {
                    userRepo,
                    workflows,
                    artifacts,
                    stargazers,
                    releases,
                    branches,
                    tags,
                    issues,
                    pullRequests,
                    commits,
                    labels,
                } = repoObject

                this.indicator.setWatchedRepo(userRepo)
                this.indicator.setWorkflows(workflows)
                this.indicator.setArtifacts(artifacts)
                this.indicator.setStargazers(stargazers)
                this.indicator.setReleases(releases)
                this.indicator.setBranches(branches)
                this.indicator.setTags(tags)
                this.indicator.setIssues(issues)
                this.indicator.setPullRequests(pullRequests)
                this.indicator.setCommits(commits)
                this.indicator.setLabels(labels)
            },
        })
    }
}
