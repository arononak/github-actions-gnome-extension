'use strict'

import {
    openUrl,
    openInstallCliScreen,
    openAuthScreen,
    bytesToString,
    formatDate
} from './utils.js'

import {
    AppStatusColor,
    appIcon,
    createAppGioIcon,
    createAppGioIconInner,
    RoundedButton,
    ExpandedMenuItem,
    IconPopupMenuItem,
    showConfirmDialog,
    conclusionIconName,
    isDarkTheme
} from './widgets.js'

import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'
import Gio from 'gi://Gio'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

export const StatusBarState = {
    NOT_INSTALLED_CLI: {
        text: () => 'Not installed CLI',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    NOT_LOGGED: {
        text: () => 'Not logged in',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    LOGGED_NO_INTERNET_CONNECTION: {
        text: () => 'No internet connection',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    LOADING: {
        text: () => 'Loading',
        simpleModeShowText: false,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.BLUE,
    },
    LOGGED_NOT_CHOOSED_REPO: {
        text: () => 'No repo entered',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    INCORRECT_REPOSITORY: {
        text: () => 'Incorrect repository',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    REPO_WITHOUT_ACTIONS: {
        text: () => 'Repo without actions',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
    IN_PROGRESS: {
        text: () => 'In progress',
        simpleModeShowText: false,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.BLUE,
    },
    COMPLETED_CANCELLED: {
        text: () => 'Cancelled',
        simpleModeShowText: false,
        color: AppStatusColor.RED,
        coloredModeColor: AppStatusColor.RED,
    },
    COMPLETED_FAILURE: {
        text: () => 'Failure',
        simpleModeShowText: false,
        color: AppStatusColor.RED,
        coloredModeColor: AppStatusColor.RED,
    },
    COMPLETED_SUCCESS: {
        text: () => 'Success',
        simpleModeShowText: false,
        color: AppStatusColor.WHITE,
        coloredModeColor: AppStatusColor.GREEN,
    },
    LONG_OPERATION_PLEASE_WAIT: {
        text: () => 'Please wait...',
        simpleModeShowText: true,
        color: AppStatusColor.GRAY,
        coloredModeColor: AppStatusColor.GRAY,
    },
}

function openSettings() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io')
    extension.openPreferences()
}

export function isCompleted(state) {
    return state === StatusBarState.COMPLETED_SUCCESS
        || state === StatusBarState.COMPLETED_FAILURE
        || state === StatusBarState.COMPLETED_CANCELLED
}

export class StatusBarIndicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this)
    }

    _init() {
        super._init(0.0, 'Github Action StatusBarButton', false)
    }

    constructor({
        simpleMode = false,
        coloredMode = false,
        uppercaseMode = false,
        extendedColoredMode = false,
        showIcon = true,
        isInstalledCli = false,
        isLogged = false,
        tokenScopes = '',
        refreshCallback = () => { },
        downloadArtifactCallback = (downloadUrl, filename) => { },
        copyTokenCallback = () => { },
        logoutCallback = () => { },
    }) {
        super()

        this.simpleMode = simpleMode
        this.coloredMode = coloredMode
        this.uppercaseMode = uppercaseMode
        this.extendedColoredMode = extendedColoredMode
        this.showIcon = showIcon

        this.tokenScopes = tokenScopes

        this.refreshCallback = refreshCallback
        this.downloadArtifactCallback = downloadArtifactCallback
        this.copyTokenCallback = copyTokenCallback
        this.logoutCallback = logoutCallback

        this.initStatusBarIndicator()

        if (isInstalledCli == false) {
            this.setState({ state: StatusBarState.NOT_INSTALLED_CLI })
            return
        }

        if (isLogged) {
            this.setState({ state: StatusBarState.LOADING, forceUpdate: false })
        } else {
            this.setState({ state: StatusBarState.NOT_LOGGED, forceUpdate: false })
        }

        this.initMenu()
    }

    initMenu() {
        if (this.menu !== null && this.menu !== undefined) {
            this.menu.removeAll()
        }
        this.initPopupMenu()
        this.setLoadingTexts()
    }

    setSimpleMode = (mode) => {
        this.simpleMode = mode
        this.refreshState()
    }

    setColoredMode = (mode) => {
        this.coloredMode = mode
        this.refreshState()
    }

    setUppercaseMode = (mode) => {
        this.uppercaseMode = mode
        this.refreshState()
    }

    setExtendedColoredMode = (mode) => {
        this.extendedColoredMode = mode
        this.refreshState()
    }

    setShowIcon = (showIcon) => {
        this.showIcon = showIcon
        this.refreshState()
    }

    showRepositoryMenu = () => (this.state === StatusBarState.IN_PROGRESS || isCompleted(this.state))

    isInstalledCli = () => this.state != StatusBarState.NOT_INSTALLED_CLI

    isLongOperation = () => this.state == StatusBarState.LONG_OPERATION_PLEASE_WAIT

    shouldShowCompletedNotification(previousState, currentState) {
        return previousState === StatusBarState.IN_PROGRESS && isCompleted(currentState)
    }

    isLogged = () => {
        if (this.state == StatusBarState.NOT_INSTALLED_CLI) {
            return false
        }

        if (this.state == StatusBarState.NOT_LOGGED) {
            return false
        }

        return true
    }

    getState = () => this.state

    refreshState() {
        this.setState({ state: this.state, forceUpdate: true })
    }

    setState({ state, forceUpdate = false }) {
        if (state === null || state === undefined) {
            return
        }

        const previousState = this.state
        this.state = state
        this.updateGithubActionsStatus(state)

        if (previousState === state) {
            return
        }

        if (previousState === StatusBarState.LONG_OPERATION_PLEASE_WAIT) {
            return
        }

        if (isCompleted(this.state)) {
            this.initMenu()
            this.refreshCallback()
            return
        }

        if (forceUpdate === false) {
            return
        }

        this.initMenu()
        this.refreshCallback()
    }

    setLoadingTexts() {
        const loadingText = StatusBarState.LOADING.text()

        this.userMenuItem?.setHeaderItemText(loadingText)
        this.starredMenuItem?.setHeaderItemText(loadingText)
        this.followersMenuItem?.setHeaderItemText(loadingText)
        this.followingMenuItem?.setHeaderItemText(loadingText)
        this.reposMenuItem?.setHeaderItemText(loadingText)
        this.gistsMenuItem?.setHeaderItemText(loadingText)
        this.starredGistsMenuItem?.setHeaderItemText(loadingText)
        this.repositoryMenuItem?.setHeaderItemText(loadingText)
        this.stargazersMenuItem?.setHeaderItemText(loadingText)
        this.workflowsMenuItem?.setHeaderItemText(loadingText)
        this.runsMenuItem?.setHeaderItemText(loadingText)
        this.releasesMenuItem?.setHeaderItemText(loadingText)
        this.branchesMenuItem?.setHeaderItemText(loadingText)
        this.tagsMenuItem?.setHeaderItemText(loadingText)
        this.artifactsMenuItem?.setHeaderItemText(loadingText)
        this.twoFactorItem?.label.set_text(loadingText)
        this.minutesItem?.label.set_text(loadingText)
        this.packagesItem?.label.set_text(loadingText)
        this.sharedStorageItem?.label.set_text(loadingText)
        this.repositoryPrivateItem?.label.set_text(loadingText)
        this.repositoryForkItem?.label.set_text(loadingText)
        this.networkButton?.boxLabel?.set_text(loadingText)
    }

    initStatusBarIndicator() {
        this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' })

        if (this.showIcon === true) {
            this.icon = new St.Icon({ style_class: 'system-status-icon' })
            this.icon.gicon = createAppGioIcon(AppStatusColor.WHITE)
            this.topBox.add_child(this.icon)
        }

        this.label = new St.Label({ text: '', y_align: Clutter.ActorAlign.CENTER, y_expand: true })
        this.topBox.add_child(this.label)
        this.add_child(this.topBox)
    }

    updateGithubActionsStatus(statusBarState) {
        if (this.simpleMode == true && statusBarState.simpleModeShowText == false) {
            this.label.text = ''
        } else {
            this.label.text = this.uppercaseMode == true
                ? statusBarState.text().toUpperCase()
                : statusBarState.text()
        }

        this.setStatusColor(
            this.coloredMode,
            this.extendedColoredMode,
            this.coloredMode ? statusBarState.coloredModeColor : statusBarState.color,
        )
    }

    setStatusColor(coloredMode, extendedColoredMode, appStatusColor) {
        const darkTheme = isDarkTheme()

        this.label.style = coloredMode
            ? `color: ${appStatusColor.color};`
            : `color: ${AppStatusColor.WHITE};`

        if (this.networkButton != null) {
            this.networkButton.setTextColor(darkTheme ? appStatusColor.textColorDark : appStatusColor.textColor)

            if (extendedColoredMode) {
                const backgroundColor = darkTheme ? appStatusColor.backgroundColorDark : appStatusColor.backgroundColor
                const borderColor = darkTheme ? appStatusColor.borderColorDark : appStatusColor.borderColor
                this.networkButton.setColor({ backgroundColor: backgroundColor, borderColor: borderColor })
            } else {
                this.networkButton.setColor({ backgroundColor: null, borderColor: null })
            }
        }
    }

    refreshGithubIcon() {
        this.networkIcon = new St.Icon({
            icon_size: 20,
            gicon: this.extendedColoredMode
                ? createAppGioIconInner(this.state.coloredModeColor)
                : appIcon()
        })
        this.networkIcon.style = 'margin-left: 2px;'

        if (this.networkButton) {
            this.networkButton.setIcon(this.networkIcon)
        }
    }

    initPopupMenu() {
        if (this.menu === null || this.menu === undefined) {
            return
        }

        this.box = new St.BoxLayout({
            style_class: 'github-actions-top-box',
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        })

        this.leftBox = new St.BoxLayout({
            style_class: 'github-actions-top-box',
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        })

        this.rightBox = new St.BoxLayout({
            style_class: 'github-actions-button-box',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            clip_to_allocation: true,
            reactive: true,
            pack_start: false,
            vertical: false
        })

        this.box.add(this.leftBox)
        this.box.add(this.rightBox)

        this.topItems = new PopupMenu.PopupBaseMenuItem({ reactive: false })
        this.topItems.remove_all_children() // Remove left margin from non visible PopupMenuItem icon
        this.topItems.actor.add_actor(this.box)
        this.menu.addMenuItem(this.topItems)

        /// Network transfer
        if (this.isLogged() && this.state != StatusBarState.LOGGED_NO_INTERNET_CONNECTION) {
            this.networkButton = new RoundedButton({ iconName: 'system-settings-symbolic', text: `` })
            this.networkButton.connect('clicked', () => openUrl('https://api.github.com/octocat'))
            this.leftBox.add(this.networkButton)
        }

        /// Settings
        this.settingsItem = new RoundedButton({ iconName: 'system-settings-symbolic' })
        this.settingsItem.connect('clicked', () => openSettings())
        this.rightBox.add_actor(this.settingsItem)

        if (this.isInstalledCli() == false) {
            this.installButton = new RoundedButton({ iconName: 'application-x-addon-symbolic' })
            this.installButton.connect('clicked', () => openInstallCliScreen())
            this.rightBox.add_actor(this.installButton)
        } else if (this.isLogged()) {
            /// Refresh
            this.refreshButton = new RoundedButton({ iconName: 'view-refresh-symbolic' })
            this.refreshButton.connect('clicked', () => this.refreshCallback())
            this.rightBox.add_actor(this.refreshButton)

            /// Logout
            this.logoutButton = new RoundedButton({ iconName: 'system-log-out-symbolic' })
            this.logoutButton.connect('clicked', async () => this.logoutCallback())
            this.rightBox.add_actor(this.logoutButton)
        } else {
            /// Login
            this.loginButton = new RoundedButton({ iconName: 'avatar-default-symbolic' })
            this.loginButton.connect('clicked', () => openAuthScreen())
            this.rightBox.add_actor(this.loginButton)
        }

        /// Logged Menu
        if (this.isLogged() && this.state != StatusBarState.LOGGED_NO_INTERNET_CONNECTION) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
            this.initLoggedMenu()
        }
    }

    initLoggedMenu() {
        /// User
        this.userMenuItem = new ExpandedMenuItem(null, '')
        this.menu.addMenuItem(this.userMenuItem)

        /// Token Scopes
        const missingScopes = this.tokenScopes.missingScopes()
        this.tokenScopesItem = new IconPopupMenuItem({
            startIconName: 'dialog-password-symbolic',
            text: `Token: ${this.tokenScopes.toString()}` + (missingScopes.length === 0 ? '' : ` - (MISSING: ${missingScopes})`),
            endIconName: 'edit-copy-symbolic',
            endIconCallback: this.copyTokenCallback,
        })
        this.userMenuItem.menuBox.add_actor(this.tokenScopesItem)

        /// 2 FA
        this.twoFactorCallback = () => this.twoFactorEnabled == false ? openUrl('https://github.com/settings/two_factor_authentication/setup/intro') : {}
        this.twoFactorItem = new IconPopupMenuItem({
            startIconName: 'security-medium-symbolic',
            itemCallback: this.twoFactorCallback,
        })
        this.userMenuItem.menuBox.add_actor(this.twoFactorItem)

        /// Minutes
        this.minutesItem = new IconPopupMenuItem({ startIconName: 'alarm-symbolic' })
        this.userMenuItem.menuBox.add_actor(this.minutesItem)

        /// Packages
        this.packagesItem = new IconPopupMenuItem({ startIconName: 'network-transmit-receive-symbolic' })
        this.userMenuItem.menuBox.add_actor(this.packagesItem)

        /// Shared Storage
        this.sharedStorageItem = new IconPopupMenuItem({ startIconName: 'network-server-symbolic' })
        this.userMenuItem.menuBox.add_actor(this.sharedStorageItem)

        if (this.simpleMode === false) {
            /// Starred
            this.starredMenuItem = new ExpandedMenuItem('starred-symbolic', '')
            this.menu.addMenuItem(this.starredMenuItem)

            /// Followers            
            this.followersMenuItem = new ExpandedMenuItem('system-users-symbolic', '')
            this.menu.addMenuItem(this.followersMenuItem)

            /// Following
            this.followingMenuItem = new ExpandedMenuItem('system-users-symbolic', '')
            this.menu.addMenuItem(this.followingMenuItem)

            /// Repos
            this.reposMenuItem = new ExpandedMenuItem('folder-symbolic', '')
            this.menu.addMenuItem(this.reposMenuItem)

            /// Gists
            this.gistsMenuItem = new ExpandedMenuItem('utilities-terminal-symbolic', '')
            this.menu.addMenuItem(this.gistsMenuItem)

            /// Starred gists
            this.starredGistsMenuItem = new ExpandedMenuItem('starred-symbolic', '')
            this.menu.addMenuItem(this.starredGistsMenuItem)
        }

        if (!this.showRepositoryMenu()) {
            return
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

        if (this.simpleMode === false) {
            /// Repository
            this.repositoryMenuItem = new ExpandedMenuItem('system-file-manager-symbolic', '', 'applications-internet-symbolic', () => openUrl(this.repositoryUrl))
            this.menu.addMenuItem(this.repositoryMenuItem)

            /// Repository isPrivate
            this.repositoryPrivateItem = new IconPopupMenuItem({ startIconName: 'changes-prevent-symbolic' })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryPrivateItem)

            /// Repository isFork
            this.repositoryForkItem = new IconPopupMenuItem({ startIconName: 'folder-remote-symbolic' })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryForkItem)

            /// Branches
            this.branchesMenuItem = new ExpandedMenuItem('media-playlist-consecutive-symbolic', '')
            this.menu.addMenuItem(this.branchesMenuItem)

            /// Tags
            this.tagsMenuItem = new ExpandedMenuItem('edit-clear-symbolic', '')
            this.menu.addMenuItem(this.tagsMenuItem)

            /// Stargazers
            this.stargazersMenuItem = new ExpandedMenuItem('starred-symbolic', '')
            this.menu.addMenuItem(this.stargazersMenuItem)

            /// Workflows
            this.workflowsMenuItem = new ExpandedMenuItem('mail-send-receive-symbolic', '')
            this.menu.addMenuItem(this.workflowsMenuItem)
        }

        /// WorkflowRuns
        this.runsMenuItem = new ExpandedMenuItem('media-playback-start-symbolic', '')
        this.menu.addMenuItem(this.runsMenuItem)

        if (this.simpleMode === false) {
            /// Releases
            this.releasesMenuItem = new ExpandedMenuItem('folder-visiting-symbolic', '')
            this.menu.addMenuItem(this.releasesMenuItem)
        }

        /// Artifacts
        this.artifactsMenuItem = new ExpandedMenuItem('folder-visiting-symbolic', '')
        this.menu.addMenuItem(this.artifactsMenuItem)
    }

    setTransferText(text) {
        if (this.networkButton != null) {
            this.networkButton.boxLabel.text = text
        }
    }

    /// Setters
    setLatestWorkflowRun(run) {
        if (run === null || run === undefined) return

        const conclusion = run["conclusion"]

        if (conclusion == 'success') {
            this.setState({ state: StatusBarState.COMPLETED_SUCCESS })
        } else if (conclusion == 'failure') {
            this.setState({ state: StatusBarState.COMPLETED_FAILURE })
        } else if (conclusion == 'cancelled') {
            this.setState({ state: StatusBarState.COMPLETED_CANCELLED })
        } else {
            this.setState({ state: StatusBarState.IN_PROGRESS })
        }

        if (this.repositoryMenuItem != null) {
            this.repositoryMenuItem.setStartIcon({ iconName: conclusionIconName(conclusion) })
            this.repositoryMenuItem.icon.icon_size = 22
        }
    }

    /// User ------------------------------------------------------------

    setUser(user) {
        if (user === null || user === undefined) return

        const userEmail = user['email']
        const userName = user['name']
        const createdAt = user['created_at']
        const userUrl = user['html_url']
        const avatarUrl = user['avatar_url']
        const twoFactorEnabled = user['two_factor_authentication']

        this.userUrl = userUrl
        this.twoFactorEnabled = twoFactorEnabled

        const userLabelText = (userName == null || userEmail == null)
            ? 'No permissions'
            : `${userName} (${userEmail}) \n\nJoined GitHub on: ${formatDate(createdAt)} `

        if (this.userMenuItem != null) {
            this.userMenuItem.icon.set_gicon(Gio.icon_new_for_string(avatarUrl))
            this.userMenuItem.icon.icon_size = 54
            this.userMenuItem.label.text = userLabelText
            this.userMenuItem.label.style = 'margin-left: 4px;'
        }

        if (this.twoFactorItem != null) {
            this.twoFactorItem.label.text = twoFactorEnabled == undefined ?
                '2FA: No permissions' :
                `2FA: ${(twoFactorEnabled == true ? 'Enabled' : 'Disabled')}`
        }
    }

    setUserBilling(minutes, packages, sharedStorage) {
        let parsedMinutes
        if (minutes != null) {
            parsedMinutes = `Usage minutes: ${minutes['total_minutes_used']} of ${minutes['included_minutes']}, ${minutes['total_paid_minutes_used']} paid`
        }

        let parsedPackages
        if (packages != null) {
            parsedPackages = `Data transfer out: ${packages['total_gigabytes_bandwidth_used']} GB of ${packages['included_gigabytes_bandwidth']} GB, ${packages['total_paid_gigabytes_bandwidth_used']} GB paid`
        }

        let parsedSharedStorage
        if (sharedStorage != null) {
            parsedSharedStorage = `Storage for month: ${sharedStorage['estimated_storage_for_month']} GB, ${sharedStorage['estimated_paid_storage_for_month']} GB paid`
        }

        if (this.minutesItem != null) {
            this.minutesItem.label.text = parsedMinutes == null ? 'No permissions' : parsedMinutes
        }

        if (this.packagesItem != null) {
            this.packagesItem.label.text = parsedPackages == null ? 'No permissions' : parsedPackages
        }

        if (this.sharedStorageItem != null) {
            this.sharedStorageItem.label.text = parsedSharedStorage == null ? 'No permissions' : parsedSharedStorage
        }
    }

    setUserStarred(starred) {
        if (starred === null || starred === undefined) return

        function toItem(e) {
            return {
                "iconName": 'starred-symbolic',
                "text": e['full_name'],
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.starredMenuItem != null) {
            this.starredMenuItem.setHeaderItemText(`Starred: ${starred.length} `)
            this.starredMenuItem.submitItems(starred.map(e => toItem(e)))
        }
    }

    setUserFollowers(followers) {
        if (followers === null || followers === undefined) return

        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.followersMenuItem != null) {
            this.followersMenuItem.setHeaderItemText(`Followers: ${followers.length} `)
            this.followersMenuItem.submitItems(followers.map(e => toItem(e)))
        }
    }

    setUserFollowing(following) {
        if (following === null || following === undefined) return

        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.followingMenuItem != null) {
            this.followingMenuItem.setHeaderItemText(`Following: ${following.length} `)
            this.followingMenuItem.submitItems(following.map(e => toItem(e)))
        }
    }

    setUserRepos(repos, onWatchCallback) {
        if (repos === null || repos === undefined) return

        function toItem(e) {
            const visibility = e['visibility']
            const createdAt = formatDate(e['created_at'])
            const name = e['name']
            const owner = e['owner']['login']

            return {
                "iconName": 'folder-symbolic',
                "text": `${createdAt} - (${visibility}) - ${name} `,
                "callback": () => openUrl(e['html_url']),
                "endButtonText": 'Watch',
                "endButtonCallback": () => onWatchCallback(owner, name),
            }
        }

        if (this.reposMenuItem != null) {
            const privateRepoCount = repos.filter((e) => e['private'] == true).length

            this.reposMenuItem.setHeaderItemText(`Repos: ${repos.length} (private: ${privateRepoCount})`)
            this.reposMenuItem.submitItems(
                repos
                    .sort((a, b) => (new Date(b['created_at'])).getTime() - (new Date(a['created_at'])).getTime())
                    .map(e => toItem(e)))
        }
    }

    setUserGists(gists) {
        if (gists === null || gists === undefined) return

        function toItem(e) {
            const createdAt = formatDate(e['created_at'])
            const description = e['description']

            return {
                "iconName": 'utilities-terminal-symbolic',
                "text": `${createdAt}` + (description.length !== 0 ? ` - ${description.replace(/\n/g, '')} ` : ''),
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.gistsMenuItem != null) {
            this.gistsMenuItem.setHeaderItemText(`Gists: ${gists.length} `)
            this.gistsMenuItem.submitItems(
                gists
                    .sort((a, b) => (new Date(b['created_at'])).getTime() - (new Date(a['created_at'])).getTime())
                    .map(e => toItem(e)))
        }
    }

    setUserStarredGists(starredGists) {
        if (starredGists === null || starredGists === undefined) return

        function toItem(e) {
            const createdAt = formatDate(e['created_at'])
            const description = e['description']

            return {
                "iconName": 'starred-symbolic',
                "text": `${createdAt}` + (description.length !== 0 ? ` - ${description.replace(/\n/g, '')} ` : ''),
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.starredGistsMenuItem != null) {
            this.starredGistsMenuItem.setHeaderItemText(`Gists: ${starredGists.length} `)
            this.starredGistsMenuItem.submitItems(
                starredGists
                    .sort((a, b) => (new Date(b['created_at'])).getTime() - (new Date(a['created_at'])).getTime())
                    .map(e => toItem(e)))
        }
    }

    /// Separator ------------------------------------------------------

    setWatchedRepo(repo) {
        if (repo === null || repo === undefined) return

        if (this.repositoryMenuItem != null) {
            this.repositoryMenuItem.label.style = 'margin-left: 4px;'
            this.repositoryMenuItem.label.text = `${repo['full_name']} \n\nCreated at: ${formatDate(repo['created_at'])} `

            this.repositoryUrl = repo['html_url']
        }

        if (this.repositoryPrivateItem != null) {
            this.repositoryPrivateItem.label.text = `Private: ${(repo["private"] == true).toString()} `
        }

        if (this.repositoryForkItem != null) {
            this.repositoryForkItem.label.text = `Fork: ${(repo["fork"] == true).toString()} `
        }
    }

    setStargazers(stargazers) {
        if (stargazers === null || stargazers === undefined) return

        function toItem(e) {
            return {
                "iconName": 'starred-symbolic',
                "text": e['login'],
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.stargazersMenuItem != null) {
            this.stargazersMenuItem.setHeaderItemText(`Stargazers: ${stargazers.length} `)
            this.stargazersMenuItem.submitItems(stargazers.map(e => toItem(e)))
        }
    }

    setWorkflows(workflows) {
        if (workflows === null || workflows === undefined) return

        function toItem(e) {
            return {
                "iconName": 'mail-send-receive-symbolic',
                "text": e['name'],
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.workflowsMenuItem != null) {
            this.workflowsMenuItem.setHeaderItemText(`Workflows: ${workflows.length} `)
            this.workflowsMenuItem.submitItems(workflows.map(e => toItem(e)))
        }
    }

    setWorkflowRuns({ runs, onDeleteWorkflowRun, onCancelWorkflowRun, onRerunWorkflowRun }) {
        if (runs === null || runs === undefined) return

        function toItem(e) {
            const conclusion = e['conclusion']
            const id = e['id']
            const runNumber = e["run_number"]
            const updatedAt = e["updated_at"]
            const displayTitle = e["display_title"]
            const name = e["name"]
            const htmlUrl = e['html_url']

            const date = formatDate(updatedAt)
            const text = `(#${runNumber}) - ${date} - ${displayTitle} `

            const iconName = conclusionIconName(conclusion)

            let showDelete
            let showCancel
            let showRerun

            if (conclusion == 'success') {
                showDelete = true
                showRerun = true
                showCancel = false
            } else if (conclusion == 'failure') {
                showDelete = true
                showRerun = true
                showCancel = false
            } else if (conclusion == 'cancelled') {
                showDelete = true
                showRerun = true
                showCancel = false
            } else {
                showDelete = false
                showRerun = false
                showCancel = true
            }

            let endButtonText
            let endButtonCallback

            if (showRerun === true) {
                endButtonText = 'Re-run'
                endButtonCallback = () => {
                    showConfirmDialog({
                        title: 'Re-run a workflow run',
                        description: 'Are you sure you want to rerun this workflow run?',
                        itemTitle: `${date} - ${displayTitle} `,
                        itemDescription: name,
                        iconName: iconName,
                        onConfirm: () => onRerunWorkflowRun(id, `${displayTitle} ${name} `),
                    })
                }
            }

            if (showCancel === true) {
                endButtonText = 'Cancel'
                endButtonCallback = () => {
                    showConfirmDialog({
                        title: 'Canceling a workflow run',
                        description: 'Are you sure you want to cancel this workflow run?',
                        itemTitle: `${date} - ${displayTitle} `,
                        itemDescription: name,
                        iconName: iconName,
                        onConfirm: () => onCancelWorkflowRun(id, `${displayTitle} ${name} `),
                    })
                }
            }

            return {
                "iconName": iconName,
                "text": text,
                "callback": () => openUrl(htmlUrl),
                "endIconName": showDelete === true ? 'application-exit-symbolic' : null,
                "endIconCallback": showDelete === true ? () => {
                    showConfirmDialog({
                        title: 'Workflow run deletion',
                        description: 'Are you sure you want to delete this workflow run?',
                        itemTitle: `${date} - ${displayTitle} `,
                        itemDescription: name,
                        iconName: iconName,
                        onConfirm: () => onDeleteWorkflowRun(id, `${displayTitle} ${name} `),
                    })
                } : null,
                "endButtonText": endButtonText,
                "endButtonCallback": endButtonCallback,
            }
        }

        if (this.runsMenuItem != null) {
            this.runsMenuItem.setHeaderItemText(`Workflow runs: ${runs.length} `)
            this.runsMenuItem.submitItems(runs.map(e => toItem(e)))
        }
    }

    setReleases(releases) {
        if (releases === null || releases === undefined) return

        function toItem(e) {
            return {
                "iconName": 'folder-visiting-symbolic',
                "text": e['name'],
                "callback": () => openUrl(e['html_url']),
            }
        }

        if (this.releasesMenuItem != null) {
            this.releasesMenuItem.setHeaderItemText(`Releases: ${releases.length} `)
            this.releasesMenuItem.submitItems(releases.map(e => toItem(e)))
        }
    }

    setArtifacts(artifacts) {
        if (artifacts === null || artifacts === undefined) return

        const self = this

        function toItem(e) {
            const createdAt = e['created_at']
            const size = bytesToString(e['size_in_bytes'])
            const filename = e['name']
            const downloadUrl = e['archive_download_url']
            const labelName = `${formatDate(createdAt)} - ${filename} - (${size}) ${(e['expired'] == true ? ' - expired' : '')} `

            return {
                "iconName": 'folder-visiting-symbolic',
                "text": labelName,
                "callback": () => self.downloadArtifactCallback(downloadUrl, filename),
            }
        }

        if (this.artifactsMenuItem != null) {
            this.artifactsMenuItem.setHeaderItemText(`Artifacts: ${artifacts.length} `)
            this.artifactsMenuItem.submitItems(artifacts.map(e => toItem(e)))
        }
    }

    setBranches(branches) {
        if (branches === null || branches === undefined) return

        const repositoryUrl = this.repositoryUrl

        function toItem(e) {
            return {
                "iconName": 'media-playlist-consecutive-symbolic',
                "text": e['name'],
                "callback": () => openUrl(repositoryUrl),
                "endIconName": e['protected'] ? 'changes-prevent-symbolic' : null,
            }
        }

        if (this.branchesMenuItem != null) {
            this.branchesMenuItem.setHeaderItemText(`Branches: ${branches.length} `)
            this.branchesMenuItem.submitItems(branches.map(e => toItem(e)))
        }
    }

    setTags(tags) {
        if (tags === null || tags === undefined) return

        function toItem(e) {
            return {
                "iconName": 'edit-clear-symbolic',
                "text": e['name'],
                "callback": () => openUrl(e['commit']['url']),
                "endIconName": 'folder-download-symbolic',
                "endIconCallback": () => openUrl(e['zipball_url'])
            }
        }

        if (this.tagsMenuItem != null) {
            this.tagsMenuItem.setHeaderItemText(`Tags: ${tags.length} `)
            this.tagsMenuItem.submitItems(tags.map(e => toItem(e)))
        }
    }
}