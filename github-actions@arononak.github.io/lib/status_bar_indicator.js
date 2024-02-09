'use strict'

import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'
import Gio from 'gi://Gio'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'

import {
    openInstallCliScreen,
    openAuthScreen,
    extensionOpenPreferences,
    bytesToString,
    openUrl,
} from './extension_utils.js'

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
    isDarkTheme,
    anvilIcon,
} from './widgets.js'

import { DateFormatController } from './date_format_controller.js'
import { ExtensionState } from './extension_controller.js'

export function isCompleted(state) {
    return state === ExtensionState.COMPLETED_SUCCESS
        || state === ExtensionState.COMPLETED_FAILURE
        || state === ExtensionState.COMPLETED_CANCELLED
}

export class StatusBarIndicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this)
    }

    _init() {
        super._init(0.0, `Github Action StatusBarButton`, false)
    }

    constructor({
        hasRepository = false,
        simpleMode = false,
        coloredMode = false,
        uppercaseMode = false,
        extendedColoredMode = false,
        showIcon = true,
        textLengthLimiter = 100,
        isInstalledCli = false,
        isLogged = false,
        tokenScopes = ``,
        refreshCallback = () => { },
        downloadArtifactCallback = (downloadUrl, filename) => { },
        copyTokenCallback = () => { },
        logoutCallback = () => { },
    }) {
        super()

        this.hasRepository = hasRepository

        this.simpleMode = simpleMode
        this.coloredMode = coloredMode
        this.uppercaseMode = uppercaseMode
        this.extendedColoredMode = extendedColoredMode
        this.showIcon = showIcon
        this.textLengthLimiter = textLengthLimiter

        this.tokenScopes = tokenScopes

        this.refreshCallback = refreshCallback
        this.downloadArtifactCallback = downloadArtifactCallback
        this.copyTokenCallback = copyTokenCallback
        this.logoutCallback = logoutCallback

        this.initStatusBarIndicator()

        if (isInstalledCli == false) {
            this.setState({ state: ExtensionState.NOT_INSTALLED_CLI })
            return
        }

        if (isLogged) {
            this.setState({ state: ExtensionState.LOADING, forceUpdate: false })
        } else {
            this.setState({ state: ExtensionState.NOT_LOGGED, forceUpdate: false })
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

    setTextLengthLimiter = (textLengthLimiter) => {
        this.textLengthLimiter = textLengthLimiter
        this.refreshState()
    }

    isInstalledCli = () => this.state != ExtensionState.NOT_INSTALLED_CLI

    isLongOperation = () => this.state == ExtensionState.LONG_OPERATION_PLEASE_WAIT

    shouldShowCompletedNotification(previousState, currentState) {
        return previousState === ExtensionState.IN_PROGRESS && isCompleted(currentState)
    }

    isLogged = () => {
        if (this.state == ExtensionState.NOT_INSTALLED_CLI) {
            return false
        }

        if (this.state == ExtensionState.NOT_LOGGED) {
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
        this.updateStatusLabel(state)

        if (previousState === state) {
            return
        }

        if (previousState === ExtensionState.LONG_OPERATION_PLEASE_WAIT) {
            return
        }

        if (state === ExtensionState.LOGGED_NO_INTERNET_CONNECTION) {
            this.setTransferEmptyState()
            return
        }

        if (forceUpdate === true) {
            this.initMenu()
            this.refreshCallback()
        }
    }

    setLoadingTexts() {
        const loadingText = ExtensionState.LOADING.text()

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
        this.issuesMenuItem?.setHeaderItemText(loadingText)
        this.commitsMenuItem?.setHeaderItemText(loadingText)
        this.labelsMenuItem?.setHeaderItemText(loadingText)
        this.pullRequestsMenuItem?.setHeaderItemText(loadingText)
        this.artifactsMenuItem?.setHeaderItemText(loadingText)
        this.twoFactorItem?.label.set_text(loadingText)
        this.minutesItem?.label.set_text(loadingText)
        this.packagesItem?.label.set_text(loadingText)
        this.sharedStorageItem?.label.set_text(loadingText)
        this.repositoryCreatedItem?.label.set_text(loadingText)
        this.repositoryPrivateItem?.label.set_text(loadingText)
        this.repositoryForkItem?.label.set_text(loadingText)
        this.repositoryLanguageItem?.label.set_text(loadingText)
        this.repositoryLicenseItem?.label.set_text(loadingText)
        this.setTransferEmptyState()
    }

    setTransferEmptyState() {
        this.setTransferText(`ACME`)
        this.setTransferIcon(anvilIcon())
    }

    initStatusBarIndicator() {
        this.topBox = new St.BoxLayout({ style_class: `panel-status-menu-box` })

        if (this.showIcon === true) {
            this.icon = new St.Icon({ style_class: `system-status-icon` })
            this.icon.gicon = createAppGioIcon(AppStatusColor.WHITE)
            this.topBox.add_child(this.icon)
        }

        this.label = new St.Label({ text: ``, y_align: Clutter.ActorAlign.CENTER, y_expand: true })
        this.topBox.add_child(this.label)
        this.add_child(this.topBox)
    }

    updateStatusLabel(extensionState) {
        if (this.simpleMode == true && extensionState.simpleModeShowText == false) {
            this.label.text = ``
        } else {
            this.label.text = this.uppercaseMode == true
                ? extensionState.text().toUpperCase()
                : extensionState.text()
        }

        this.setStatusColor(
            this.coloredMode,
            this.extendedColoredMode,
            this.coloredMode ? extensionState.coloredModeColor : extensionState.color,
        )
    }

    setStatusColor(coloredMode, extendedColoredMode, appStatusColor) {
        const darkTheme = isDarkTheme()

        this.label.style = coloredMode
            ? `color: ${appStatusColor.color};`
            : `color: ${AppStatusColor.WHITE};`

        if (this.networkButton != null) {
            if (extendedColoredMode === true && coloredMode === true) {
                this.networkButton.setTextColor(
                    darkTheme ? appStatusColor.textColorDark : appStatusColor.textColor,
                )
                this.networkButton.setColor({
                    backgroundColor: darkTheme ? appStatusColor.backgroundColorDark : appStatusColor.backgroundColor,
                    borderColor: darkTheme ? appStatusColor.borderColorDark : appStatusColor.borderColor,
                })
            }
        }
    }

    refreshGithubIcon() {
        const githubIcon = this.extendedColoredMode
            ? createAppGioIconInner(this.state.coloredModeColor)
            : appIcon()

        this.setTransferIcon(githubIcon)
    }

    setTransferIcon(gicon) {
        this.networkIcon = new St.Icon({ icon_size: 20, gicon })
        this.networkIcon.style = `margin-left: 2px;`

        if (this.networkButton) {
            this.networkButton.setIcon(this.networkIcon)
        }
    }

    initPopupMenu() {
        if (this.menu === null || this.menu === undefined) {
            return
        }

        this.box = new St.BoxLayout({
            style_class: `github-actions-top-box`,
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        })

        this.leftBox = new St.BoxLayout({
            style_class: `github-actions-top-box`,
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        })

        this.rightBox = new St.BoxLayout({
            style_class: `github-actions-button-box`,
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

        // Network transfer
        if (this.isLogged() && this.state != ExtensionState.LOGGED_NO_INTERNET_CONNECTION) {
            this.networkButton = new RoundedButton({ iconName: `system-settings-symbolic`, text: `` })
            this.networkButton.connect(`clicked`, () => openUrl(`https://api.github.com/octocat`))
            this.leftBox.add(this.networkButton)
        }

        // Settings
        this.settingsItem = new RoundedButton({ iconName: `system-settings-symbolic` })
        this.settingsItem.connect(`clicked`, () => extensionOpenPreferences())
        this.rightBox.add_actor(this.settingsItem)

        if (this.isInstalledCli() == false) {
            this.installButton = new RoundedButton({ iconName: `application-x-addon-symbolic` })
            this.installButton.connect(`clicked`, () => openInstallCliScreen())
            this.rightBox.add_actor(this.installButton)
        } else if (this.isLogged()) {
            // Refresh
            this.refreshButton = new RoundedButton({ iconName: `view-refresh-symbolic` })
            this.refreshButton.connect(`clicked`, () => this.refreshCallback())
            this.rightBox.add_actor(this.refreshButton)

            // Logout
            this.logoutButton = new RoundedButton({ iconName: `system-log-out-symbolic` })
            this.logoutButton.connect(`clicked`, () => this.logoutCallback())
            this.rightBox.add_actor(this.logoutButton)
        } else {
            // Login
            this.loginButton = new RoundedButton({ iconName: `avatar-default-symbolic` })
            this.loginButton.connect(`clicked`, () => openAuthScreen())
            this.rightBox.add_actor(this.loginButton)
        }

        // Logged Menu
        if (this.isLogged() && this.state != ExtensionState.LOGGED_NO_INTERNET_CONNECTION) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
            this.initLoggedMenu()
        }
    }

    initLoggedMenu() {
        // User
        this.userMenuItem = new ExpandedMenuItem(null, ``)
        this.menu.addMenuItem(this.userMenuItem)

        // Token Scopes
        const missingScopes = this.tokenScopes.missingScopes()
        const hasAllScopes = missingScopes.length === 0
        this.tokenScopesItem = new IconPopupMenuItem({
            startIconName: `dialog-password-symbolic`,
            text: `Token: ${this.tokenScopes.toString()}${hasAllScopes ? `` : ` - (MISSING: ${missingScopes})`}`,
            endIconName: `edit-copy-symbolic`,
            endIconCallback: this.copyTokenCallback,
            endButtonText: hasAllScopes ? null : `Relogin`,
            endButtonCallback: hasAllScopes ? null : () => openAuthScreen(),
        })
        this.userMenuItem.menuBox.add_actor(this.tokenScopesItem)

        // 2 FA
        this.twoFactorCallback = () => this.twoFactorEnabled == false ? openUrl(`https://github.com/settings/two_factor_authentication/setup/intro`) : {}
        this.twoFactorItem = new IconPopupMenuItem({
            startIconName: `security-medium-symbolic`,
            itemCallback: this.twoFactorCallback,
        })
        this.userMenuItem.menuBox.add_actor(this.twoFactorItem)

        // Minutes
        this.minutesItem = new IconPopupMenuItem({ startIconName: `alarm-symbolic` })
        this.userMenuItem.menuBox.add_actor(this.minutesItem)

        // Packages
        this.packagesItem = new IconPopupMenuItem({ startIconName: `network-transmit-receive-symbolic` })
        this.userMenuItem.menuBox.add_actor(this.packagesItem)

        // Shared Storage
        this.sharedStorageItem = new IconPopupMenuItem({ startIconName: `network-server-symbolic` })
        this.userMenuItem.menuBox.add_actor(this.sharedStorageItem)

        if (this.simpleMode === false) {
            // Starred
            this.starredMenuItem = new ExpandedMenuItem(`starred-symbolic`, ``)
            this.menu.addMenuItem(this.starredMenuItem)

            // Followers
            this.followersMenuItem = new ExpandedMenuItem(`system-users-symbolic`, ``)
            this.menu.addMenuItem(this.followersMenuItem)

            // Following
            this.followingMenuItem = new ExpandedMenuItem(`system-users-symbolic`, ``)
            this.menu.addMenuItem(this.followingMenuItem)

            // Repos
            this.reposMenuItem = new ExpandedMenuItem(`folder-symbolic`, ``)
            this.menu.addMenuItem(this.reposMenuItem)

            // Gists
            this.gistsMenuItem = new ExpandedMenuItem(`utilities-terminal-symbolic`, ``)
            this.menu.addMenuItem(this.gistsMenuItem)

            // Starred gists
            this.starredGistsMenuItem = new ExpandedMenuItem(`starred-symbolic`, ``)
            this.menu.addMenuItem(this.starredGistsMenuItem)
        }

        if (!this.hasRepository) {
            return
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

        if (this.simpleMode === false) {
            // Repository
            this.repositoryMenuItem = new ExpandedMenuItem(`system-file-manager-symbolic`, ``, `applications-internet-symbolic`, () => openUrl(this.repositoryUrl))
            this.menu.addMenuItem(this.repositoryMenuItem)

            // Repository createdAt
            this.repositoryCreatedItem = new IconPopupMenuItem({ startIconName: `x-office-calendar-symbolic` })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryCreatedItem)

            // Repository isPrivate
            this.repositoryPrivateItem = new IconPopupMenuItem({ startIconName: `changes-prevent-symbolic` })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryPrivateItem)

            // Repository isFork
            this.repositoryForkItem = new IconPopupMenuItem({ startIconName: `system-software-install-symbolic` })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryForkItem)

            // Repository language
            this.repositoryLanguageItem = new IconPopupMenuItem({ startIconName: `preferences-desktop-locale-symbolic` })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryLanguageItem)

            // Repository license
            this.repositoryLicenseItem = new IconPopupMenuItem({ startIconName: `accessories-text-editor-symbolic` })
            this.repositoryMenuItem.menuBox.add_actor(this.repositoryLicenseItem)

            // Commits
            this.commitsMenuItem = new ExpandedMenuItem(`media-record-symbolic`, ``)
            this.menu.addMenuItem(this.commitsMenuItem)

            // Branches
            this.branchesMenuItem = new ExpandedMenuItem(`media-playlist-consecutive-symbolic`, ``)
            this.menu.addMenuItem(this.branchesMenuItem)

            // Tags
            this.tagsMenuItem = new ExpandedMenuItem(`edit-clear-symbolic`, ``)
            this.menu.addMenuItem(this.tagsMenuItem)

            // Labels
            this.labelsMenuItem = new ExpandedMenuItem(`edit-clear-symbolic`, ``)
            this.menu.addMenuItem(this.labelsMenuItem)

            // Issues
            this.issuesMenuItem = new ExpandedMenuItem(`media-optical-symbolic`, ``)
            this.menu.addMenuItem(this.issuesMenuItem)

            // Pull requests
            this.pullRequestsMenuItem = new ExpandedMenuItem(`view-restore-symbolic`, ``)
            this.menu.addMenuItem(this.pullRequestsMenuItem)

            // Stargazers
            this.stargazersMenuItem = new ExpandedMenuItem(`starred-symbolic`, ``)
            this.menu.addMenuItem(this.stargazersMenuItem)

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

            // Workflows
            this.workflowsMenuItem = new ExpandedMenuItem(`mail-send-receive-symbolic`, ``)
            this.menu.addMenuItem(this.workflowsMenuItem)
        }

        // WorkflowRuns
        this.runsMenuItem = new ExpandedMenuItem(`media-playback-start-symbolic`, ``)
        this.menu.addMenuItem(this.runsMenuItem)

        if (this.simpleMode === false) {
            // Releases
            this.releasesMenuItem = new ExpandedMenuItem(`folder-visiting-symbolic`, ``)
            this.menu.addMenuItem(this.releasesMenuItem)
        }

        // Artifacts
        this.artifactsMenuItem = new ExpandedMenuItem(`folder-visiting-symbolic`, ``)
        this.menu.addMenuItem(this.artifactsMenuItem)
    }

    setTransferText(text) {
        if (this.networkButton != null && this.networkButton != undefined) {
            if (this.networkButton.boxLabel != null && this.networkButton.boxLabel != undefined) {
                this.networkButton.boxLabel.text = text
            }
        }
    }

    // Setters
    setLatestWorkflowRun(run) {
        if (run === null || run === undefined) return

        const conclusion = run[`conclusion`]

        if (conclusion == `success`) {
            this.setState({ state: ExtensionState.COMPLETED_SUCCESS })
        } else if (conclusion == `failure`) {
            this.setState({ state: ExtensionState.COMPLETED_FAILURE })
        } else if (conclusion == `cancelled`) {
            this.setState({ state: ExtensionState.COMPLETED_CANCELLED })
        } else {
            this.setState({ state: ExtensionState.IN_PROGRESS })
        }

        if (this.repositoryMenuItem != null) {
            this.repositoryMenuItem.setStartIcon({ iconName: conclusionIconName(conclusion) })
            this.repositoryMenuItem.icon.icon_size = 22

            const repositoryName = run[`repository`][`full_name`]
            const repositoryLatestRun = `#${run[`run_number`]} - ${run[`display_title`]}`

            this.repositoryMenuItem.label.style = `margin-left: 4px;`
            this.repositoryMenuItem.label.text = `${repositoryName}\n\n${repositoryLatestRun}`
        }
    }

    // User ------------------------------------------------------------

    setUser(user) {
        if (user === null || user === undefined) return

        const userEmail = user[`email`]
        const userName = user[`name`]
        const createdAt = user[`created_at`]
        const userUrl = user[`html_url`]
        const avatarUrl = user[`avatar_url`]
        const twoFactorEnabled = user[`two_factor_authentication`]

        if (avatarUrl == undefined) {
            return
        }

        this.userUrl = userUrl
        this.twoFactorEnabled = twoFactorEnabled

        const userLabelText = userName == null || userEmail == null
            ? `No permissions`
            : `${userName} (${userEmail}) \n\nJoined GitHub on: ${DateFormatController.format(createdAt)} `

        if (this.userMenuItem != null) {
            this.userMenuItem.icon.set_gicon(Gio.icon_new_for_string(avatarUrl))
            this.userMenuItem.icon.icon_size = 54
            this.userMenuItem.label.text = userLabelText
            this.userMenuItem.label.style = `margin-left: 4px;`
        }

        if (this.twoFactorItem != null) {
            this.twoFactorItem.label.text = twoFactorEnabled == undefined
                ? `2FA: No permissions`
                : `2FA: ${twoFactorEnabled == true ? `Enabled` : `Disabled`}`
        }
    }

    setUserBilling(minutes, packages, sharedStorage) {
        let parsedMinutes
        if (minutes != null) {
            parsedMinutes = `Usage minutes: ${minutes[`total_minutes_used`]} of ${minutes[`included_minutes`]}, ${minutes[`total_paid_minutes_used`]} paid`
        }

        let parsedPackages
        if (packages != null) {
            parsedPackages = `Data transfer out: ${packages[`total_gigabytes_bandwidth_used`]} GB of ${packages[`included_gigabytes_bandwidth`]} GB, ${packages[`total_paid_gigabytes_bandwidth_used`]} GB paid`
        }

        let parsedSharedStorage
        if (sharedStorage != null) {
            parsedSharedStorage = `Storage for month: ${sharedStorage[`estimated_storage_for_month`]} GB, ${sharedStorage[`estimated_paid_storage_for_month`]} GB paid`
        }

        if (this.minutesItem != null) {
            this.minutesItem.label.text = parsedMinutes == null ? `No permissions` : parsedMinutes
        }

        if (this.packagesItem != null) {
            this.packagesItem.label.text = parsedPackages == null ? `No permissions` : parsedPackages
        }

        if (this.sharedStorageItem != null) {
            this.sharedStorageItem.label.text = parsedSharedStorage == null ? `No permissions` : parsedSharedStorage
        }
    }

    setUserStarred(starred) {
        if (starred === null || starred === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `starred-symbolic`,
                "text": e[`full_name`].slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.starredMenuItem != null) {
            this.starredMenuItem.setHeaderItemText(`Starred: ${starred.length} `)
            this.starredMenuItem.submitItems(starred.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setUserFollowers(followers) {
        if (followers === null || followers === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `system-users-symbolic`,
                "text": e[`login`].slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.followersMenuItem != null) {
            this.followersMenuItem.setHeaderItemText(`Followers: ${followers.length} `)
            this.followersMenuItem.submitItems(followers.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setUserFollowing(following) {
        if (following === null || following === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `system-users-symbolic`,
                "text": e[`login`].slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.followingMenuItem != null) {
            this.followingMenuItem.setHeaderItemText(`Following: ${following.length} `)
            this.followingMenuItem.submitItems(following.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setUserRepos(repos, onWatchCallback) {
        if (repos === null || repos === undefined) return

        function toItem(e, textLengthLimiter) {
            const createdAt = DateFormatController.format(e[`created_at`])
            const name = e[`name`]
            const owner = e[`owner`][`login`]
            const language = e[`language`] == null ? `` : `(${e[`language`]})`
            const isPrivate = e[`private`] == true
            const stars = e[`stargazers_count`]

            return {
                "iconName": isPrivate ? `changes-prevent-symbolic` : `network-workgroup-symbolic`,
                "text": `${createdAt} - ${name} ${language}`.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
                "endButtonText": `${stars} stars`,
                "endButtonCallback": () => { },
                "endIconName": `emblem-ok-symbolic`,
                "endIconCallback": () => onWatchCallback(owner, name),
            }
        }

        if (this.reposMenuItem != null) {
            this.reposMenuItem.setHeaderItemText(`Repos: ${repos.length}`)
            this.reposMenuItem.submitItems(
                repos
                    .sort((a, b) => new Date(b[`created_at`]).getTime() - new Date(a[`created_at`]).getTime())
                    .map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setUserGists(gists) {
        if (gists === null || gists === undefined) return

        function toItem(e, textLengthLimiter) {
            const createdAt = DateFormatController.format(e[`created_at`])
            const description = e[`description`]
            const text = `${createdAt}${description.length !== 0 ? ` - ${description.replace(/\n/g, ``)} ` : ``}`

            return {
                "iconName": `utilities-terminal-symbolic`,
                "text": text.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.gistsMenuItem != null) {
            this.gistsMenuItem.setHeaderItemText(`Gists: ${gists.length} `)
            this.gistsMenuItem.submitItems(
                gists
                    .sort((a, b) => new Date(b[`created_at`]).getTime() - new Date(a[`created_at`]).getTime())
                    .map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setUserStarredGists(starredGists) {
        if (starredGists === null || starredGists === undefined) return

        function toItem(e, textLengthLimiter) {
            const createdAt = DateFormatController.format(e[`created_at`])
            const description = e[`description`]
            const text = `${createdAt}${description.length !== 0 ? ` - ${description.replace(/\n/g, ``)} ` : ``}`

            return {
                "iconName": `starred-symbolic`,
                "text": text.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.starredGistsMenuItem != null) {
            this.starredGistsMenuItem.setHeaderItemText(`Gists: ${starredGists.length} `)
            this.starredGistsMenuItem.submitItems(
                starredGists
                    .sort((a, b) => new Date(b[`created_at`]).getTime() - new Date(a[`created_at`]).getTime())
                    .map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    // Separator ------------------------------------------------------

    setWatchedRepo(repo) {
        if (repo === null || repo === undefined) return

        this.repositoryUrl = repo[`html_url`]

        this.repositoryMenuItem.label.text = repo[`full_name`]

        if (this.repositoryCreatedItem != null) {
            this.repositoryCreatedItem.label.text = `Created at: ${DateFormatController.format(repo[`created_at`])} `
        }

        if (this.repositoryPrivateItem != null) {
            this.repositoryPrivateItem.label.text = `Private: ${(repo[`private`] == true).toString()} `
        }

        if (this.repositoryForkItem != null) {
            this.repositoryForkItem.label.text = `Fork: ${(repo[`fork`] == true).toString()} `
        }

        if (this.repositoryLanguageItem != null) {
            this.repositoryLanguageItem.label.text = `Language: ${repo[`language`].toString()} `
        }

        if (this.repositoryLicenseItem != null) {
            this.repositoryLicenseItem.label.text = `License: ${repo[`license`] != null ? repo[`license`][`spdx_id`] : `Empty`}`
        }
    }

    setStargazers(stargazers) {
        if (stargazers === null || stargazers === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `starred-symbolic`,
                "text": e[`login`].slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.stargazersMenuItem != null) {
            this.stargazersMenuItem.setHeaderItemText(`Stargazers: ${stargazers.length} `)
            this.stargazersMenuItem.submitItems(stargazers.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setWorkflows(workflows) {
        if (workflows === null || workflows === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `mail-send-receive-symbolic`,
                "text": e[`name`].slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.workflowsMenuItem != null) {
            this.workflowsMenuItem.setHeaderItemText(`Workflows: ${workflows.length}`)
            this.workflowsMenuItem.submitItems(workflows.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setWorkflowRuns({ runs, onDeleteWorkflowRun, onCancelWorkflowRun, onRerunWorkflowRun }) {
        if (runs === null || runs === undefined) return

        function toItem(e, textLengthLimiter) {
            const conclusion = e[`conclusion`]
            const id = e[`id`]
            const runNumber = e[`run_number`]
            const updatedAt = e[`updated_at`]
            const displayTitle = e[`display_title`]
            const name = e[`name`]
            const htmlUrl = e[`html_url`]

            const date = DateFormatController.format(updatedAt)
            const text = `(#${runNumber}) - ${date} - ${displayTitle} `

            const iconName = conclusionIconName(conclusion)

            let showDelete
            let showCancel
            let showRerun

            if (conclusion == `success`) {
                showDelete = true
                showRerun = true
                showCancel = false
            } else if (conclusion == `failure`) {
                showDelete = true
                showRerun = true
                showCancel = false
            } else if (conclusion == `cancelled`) {
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
                endButtonText = `Re-run`
                endButtonCallback = () => {
                    showConfirmDialog({
                        title: `Re-run a workflow run`,
                        description: `Are you sure you want to rerun this workflow run?`,
                        itemTitle: `${date} - ${displayTitle} `,
                        itemDescription: name,
                        iconName,
                        onConfirm: () => onRerunWorkflowRun(id, `${displayTitle} ${name} `),
                    })
                }
            }

            if (showCancel === true) {
                endButtonText = `Cancel`
                endButtonCallback = () => {
                    showConfirmDialog({
                        title: `Canceling a workflow run`,
                        description: `Are you sure you want to cancel this workflow run?`,
                        itemTitle: `${date} - ${displayTitle} `,
                        itemDescription: name,
                        iconName,
                        onConfirm: () => onCancelWorkflowRun(id, `${displayTitle} ${name} `),
                    })
                }
            }

            return {
                iconName,
                "text": text.slice(0, textLengthLimiter),
                "callback": () => openUrl(htmlUrl),
                "endIconName": showDelete === true ? `application-exit-symbolic` : null,
                "endIconCallback": showDelete === true ? () => {
                    showConfirmDialog({
                        title: `Workflow run deletion`,
                        description: `Are you sure you want to delete this workflow run?`,
                        itemTitle: `${date} - ${displayTitle} `,
                        itemDescription: name,
                        iconName,
                        onConfirm: () => onDeleteWorkflowRun(id, `${displayTitle} ${name} `),
                    })
                } : null,
                endButtonText,
                endButtonCallback,
            }
        }

        if (this.runsMenuItem != null) {
            this.runsMenuItem.setHeaderItemText(`Workflow runs: ${runs.length} `)
            this.runsMenuItem.submitItems(runs.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setReleases(releases) {
        if (releases === null || releases === undefined) return

        function toItem(e, textLengthLimiter) {
            const publishedAt = e[`published_at`]
            const name = e[`name`]
            const labelText = `${DateFormatController.format(publishedAt)} - ${name})`

            return {
                "iconName": `folder-visiting-symbolic`,
                "text": labelText.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.releasesMenuItem != null) {
            this.releasesMenuItem.setHeaderItemText(`Releases: ${releases.length}`)
            this.releasesMenuItem.submitItems(releases.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setArtifacts(artifacts) {
        if (artifacts === null || artifacts === undefined) return

        const self = this

        function toItem(e, textLengthLimiter) {
            const createdAt = e[`created_at`]
            const size = bytesToString(e[`size_in_bytes`])
            const filename = e[`name`]
            const downloadUrl = e[`archive_download_url`]
            const labelName = `${DateFormatController.format(createdAt)} - ${filename} - (${size})`
            const isExpired = e[`expired`] == true

            return {
                "iconName": isExpired ? `window-close-symbolic` : `folder-visiting-symbolic`,
                "text": labelName.slice(0, textLengthLimiter),
                "callback": () => isExpired ? null : self.downloadArtifactCallback(downloadUrl, filename),
            }
        }

        if (this.artifactsMenuItem != null) {
            this.artifactsMenuItem.setHeaderItemText(`Artifacts: ${artifacts.length}`)
            this.artifactsMenuItem.submitItems(artifacts.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setBranches(branches) {
        if (branches === null || branches === undefined) return

        const repositoryUrl = this.repositoryUrl

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `media-playlist-consecutive-symbolic`,
                "text": e[`name`].slice(0, textLengthLimiter),
                "callback": () => openUrl(repositoryUrl),
                "endIconName": e[`protected`] ? `changes-prevent-symbolic` : null,
            }
        }

        if (this.branchesMenuItem != null) {
            this.branchesMenuItem.setHeaderItemText(`Branches: ${branches.length} `)
            this.branchesMenuItem.submitItems(branches.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setTags(tags) {
        if (tags === null || tags === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `edit-clear-symbolic`,
                "text": e[`name`].slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`commit`][`url`]),
                "endIconName": `folder-download-symbolic`,
                "endIconCallback": () => openUrl(e[`zipball_url`])
            }
        }

        if (this.tagsMenuItem != null) {
            this.tagsMenuItem.setHeaderItemText(`Tags: ${tags.length} `)
            this.tagsMenuItem.submitItems(tags.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setLabels(labels) {
        if (labels === null || labels === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `edit-clear-symbolic`,
                "text": `${e[`name`]} - ${e[`description`]}`.slice(0, textLengthLimiter),
            }
        }

        if (this.labelsMenuItem != null) {
            this.labelsMenuItem.setHeaderItemText(`Labels: ${labels.length} `)
            this.labelsMenuItem.submitItems(labels.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setPullRequests(pullRequests) {
        if (pullRequests === null || pullRequests === undefined) return

        function toItem(e, textLengthLimiter) {
            return {
                "iconName": `view-restore-symbolic`,
                "text": `#${e[`number`]} ${e[`title`]}`.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.pullRequestsMenuItem != null) {
            this.pullRequestsMenuItem.setHeaderItemText(`Pull requests: ${pullRequests.length}`.slice(0, 200))
            this.pullRequestsMenuItem.submitItems(pullRequests.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setIssues(issues) {
        if (issues === null || issues === undefined) return

        function toItem(e, textLengthLimiter) {
            const number = e[`number`]
            const createdAt = e[`created_at`]
            const state = e[`state`]

            const date = DateFormatController.format(createdAt)

            function icon(_state) {
                switch (_state) {
                    case `open`:
                        return `emblem-important-symbolic`
                    case `closed`:
                        return `emblem-ok-symbolic`
                    default:
                        return `view-grid-symbolic`
                }
            }

            return {
                "iconName": icon(state),
                "text": `(#${number}) - ${date} - ${e[`title`]}`.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.issuesMenuItem != null) {
            this.issuesMenuItem.setHeaderItemText(`Issues: ${issues.length}`)
            this.issuesMenuItem.submitItems(issues.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }

    setCommits(commits) {
        if (commits === null || commits === undefined) return

        function toItem(e, textLengthLimiter) {
            const date = DateFormatController.format(e[`commit`][`author`][`date`])
            const authorName = e[`commit`][`author`][`name`]
            const authorEmail = e[`commit`][`author`][`email`]
            const message = e[`commit`][`message`].replace(/\s+/g, ` `)

            return {
                "iconName": `media-record-symbolic`,
                "text": `${date} - ${authorName} (${authorEmail}) - ${message}`.slice(0, textLengthLimiter),
                "callback": () => openUrl(e[`html_url`]),
            }
        }

        if (this.commitsMenuItem != null) {
            this.commitsMenuItem.setHeaderItemText(`Commits: ${commits.length}`)
            this.commitsMenuItem.submitItems(commits.map((e) => toItem(e, this.textLengthLimiter)))
        }
    }
}
