'use strict';

const { Clutter, GObject, St, Gio } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

const utils = Me.imports.utils;
const widgets = Me.imports.widgets;
const repository = Me.imports.data_repository;
const cliInterface = Me.imports.local_cli_interface;
const AppIconColor = Me.imports.widgets.AppIconColor;

var StatusBarState = {
    NOT_LOGGED: {
        text: () => 'NOT LOGGED IN',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.GRAY,
    },
    LOADING: {
        text: () => 'LOADING',
        simpleModeShowText: false,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.BLUE,
    },
    LOGGED_NOT_CHOOSED_REPO: {
        text: () => 'NO REPO ENTERED',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.RED,
    },
    INCORRECT_REPOSITORY: {
        text: () => 'INCORRECT REPOSITORY',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.RED,
    },
    IN_PROGRESS: {
        text: () => 'IN PROGRESS',
        simpleModeShowText: false,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.BLUE,
    },
    COMPLETED_SUCCESS: {
        text: () => 'COMPLETED SUCCESS',
        simpleModeShowText: false,
        color: AppIconColor.WHITE,
        coloredModeColor: AppIconColor.GREEN,
    },
    COMPLETED_CANCELED: {
        text: () => 'COMPLETED CANCELED',
        simpleModeShowText: false,
        color: AppIconColor.RED,
        coloredModeColor: AppIconColor.RED,
    },
    COMPLETED_FAILURE: {
        text: () => 'COMPLETED FAILURE',
        simpleModeShowText: false,
        color: AppIconColor.RED,
        coloredModeColor: AppIconColor.RED,
    },
}

function workflowRunConclusionIcon(conclusion) {
    if (conclusion == 'success') {
        return 'emblem-default';
    } else if (conclusion == 'failure') {
        return 'emblem-unreadable';
    } else {
        return 'emblem-synchronizing';
    }
}

var StatusBarIndicator = class StatusBarIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Github Action button', false);
    }

    constructor({
        simpleMode = false,
        coloredMode = false,
        isLogged = false,
        refreshCallback = () => { },
    }) {
        super();
        this.refreshCallback = refreshCallback;

        this.simpleMode = simpleMode;
        this.coloredMode = coloredMode;

        this.initStatusBarIndicator();
        this.setState({ state: isLogged ? StatusBarState.LOADING : StatusBarState.NOT_LOGGED });
    }

    setSimpleMode = (mode) => {
        this.simpleMode = mode;
        this.refreshState();
    };

    setColoredMode = (mode) => {
        this.coloredMode = mode;
        this.refreshState();
    };

    isCorrectState = () => this.state == StatusBarState.COMPLETED_SUCCESS;
    isLogged = () => this.state != StatusBarState.NOT_LOGGED;

    shouldShowCompletedNotification(previousState, currentState) {
        return !utils.isEmpty(previousState)
            && previousState !== StatusBarState.LOADING.text()
            && previousState !== StatusBarState.NOT_LOGGED.text()
            && previousState !== currentState;
    }

    updateGithubActionsStatus(statusBarState) {
        if (this.simpleMode == true && statusBarState.simpleModeShowText == false) {
            this.label.text = '';
        } else {
            this.label.text = statusBarState.text();
        }

        this.setStatusIconColor(this.coloredMode ? statusBarState.coloredModeColor : statusBarState.color);
    }

    initStatusBarIndicator() {
        this.label = new St.Label({
            style_class: 'github-actions-label',
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });

        this.icon = new St.Icon({ style_class: 'system-status-icon' });
        this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.topBox.add_child(this.icon);
        this.topBox.add_child(this.label);
        this.add_child(this.topBox);
    }

    setStatusIconColor(appIconColor) {
        if (this.icon == null) {
            return;
        }

        this.icon.gicon = widgets.createAppGioIcon(appIconColor);
    }

    refreshBoredIcon() {
        this.boredButton.child = new St.Icon({ gicon: widgets.appIcon() });

    }

    refreshState() {
        this.setState({ state: this.state, forceUpdate: true, });
    }

    setState({ state, forceUpdate = false }) {
        if (this.state == state && forceUpdate == false) {
            return;
        }

        this.state = state;
        this.menu.removeAll();
        this.initPopupMenu();
        this.setLoadingTexts();
        this.updateGithubActionsStatus(state);

        if (this.state != StatusBarState.LOADING) {
            this.refreshCallback();
        }
    }

    setLoadingTexts() {
        const loadingText = StatusBarState.LOADING.text();

        this.updateGithubActionsStatus(StatusBarState.LOADING);

        this.userMenuItem?.setHeaderItemText(loadingText)
        this.starredMenuItem?.setHeaderItemText(loadingText)
        this.followersMenuItem?.setHeaderItemText(loadingText);
        this.followingMenuItem?.setHeaderItemText(loadingText);
        this.repositoryMenuItem?.setHeaderItemText(loadingText);
        this.stargazersMenuItem?.setHeaderItemText(loadingText);
        this.workflowsMenuItem?.setHeaderItemText(loadingText);
        this.runsMenuItem?.setHeaderItemText(loadingText);
        this.releasesMenuItem?.setHeaderItemText(loadingText);
        this.artifactsMenuItem?.setHeaderItemText(loadingText);
        this.twoFactorItem?.label.set_text(loadingText);
        this.minutesItem?.label.set_text(loadingText);
        this.packagesItem?.label.set_text(loadingText);
        this.sharedStorageItem?.label.set_text(loadingText);
        this.repositoryPrivateItem?.label.set_text(loadingText);
        this.repositoryForkItem?.label.set_text(loadingText);
        this.infoItem?.label.set_text(loadingText);
        this.networkLabel?.set_text(loadingText);
    }

    initPopupMenu() {
        this.box = new St.BoxLayout({
            style_class: 'github-actions-top-box',
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.leftBox = new St.BoxLayout({
            style_class: 'github-actions-top-box',
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.rightBox = new St.BoxLayout({
            style_class: 'github-actions-button-box',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            clip_to_allocation: true,
            reactive: true,
            pack_start: false,
            vertical: false
        });

        this.box.add(this.leftBox);
        this.box.add(this.rightBox);

        this.bottomItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.bottomItem.remove_all_children(); // Remove left margin from non visible PopupMenuItem icon
        this.bottomItem.actor.add_actor(this.box);
        this.menu.addMenuItem(this.bottomItem);

        /// Network transfer
        this.networkContainer = new St.BoxLayout();
        this.networkButton = new St.Button({ style_class: 'button github-actions-button-action' });
        this.networkButton.connect('clicked', () => ExtensionUtils.openPrefs());
        this.networkIcon = new St.Icon({ icon_name: 'network-wireless-symbolic', icon_size: 20 });
        this.networkIcon.style = 'margin-left: 2px;';
        this.networkLabel = new St.Label();
        this.networkLabel.style = 'margin-left: 8px; margin-top: 2px; margin-right: 2px;';
        this.networkContainer.add(this.networkIcon);
        this.networkContainer.add(this.networkLabel);
        this.networkButton.set_child(this.networkContainer);

        if (this.isLogged()) {
            this.leftBox.add(this.networkButton);
        }

        /// Bored
        this.boredButton = widgets.createRoundButton({ icon: new St.Icon({ gicon: widgets.createAppGioIcon(AppIconColor.WHITE) }) });
        this.boredButton.connect('clicked', () => utils.openUrl('https://api.github.com/octocat'));
        this.rightBox.add_actor(this.boredButton);

        /// Settings
        this.settingsItem = widgets.createRoundButton({ iconName: 'system-settings-symbolic' });
        this.settingsItem.connect('clicked', () => ExtensionUtils.openPrefs());
        this.rightBox.add_actor(this.settingsItem);

        /// Refresh
        this.refreshButton = widgets.createRoundButton({ iconName: 'view-refresh-symbolic' });
        this.refreshButton.connect('clicked', () => this.refreshCallback());
        this.rightBox.add_actor(this.refreshButton);

        if (this.isLogged()) {
            /// Logout
            this.logoutButton = widgets.createRoundButton({ iconName: 'system-log-out-symbolic' });
            this.logoutButton.connect('clicked', async () => this.logout());
            this.rightBox.add_actor(this.logoutButton);
        } else {
            /// Login
            this.loginButton = widgets.createRoundButton({ iconName: 'avatar-default-symbolic' });
            this.loginButton.connect('clicked', () => utils.openAuthScreen());
            this.rightBox.add_actor(this.loginButton);
        }

        /// Logged Menu
        if (this.isLogged()) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.initLoggedMenu();
        }
    }

    async logout() {
        const status = await cliInterface.logout();

        if (status == true) {
            this.setState({ state: StatusBarState.NOT_LOGGED });
            this.refreshCallback();
        }
    }

    initLoggedMenu() {
        /// User
        this.userMenuItem = new widgets.ExpandedMenuItem(null, '');
        this.menu.addMenuItem(this.userMenuItem);

        /// 2 FA
        this.twoFactorCallback = () => this.twoFactorEnabled == false ? utils.openUrl('https://github.com/settings/two_factor_authentication/setup/intro') : {};
        this.twoFactorItem = widgets.createPopupImageMenuItem('', 'security-medium-symbolic', this.twoFactorCallback);
        this.userMenuItem.menuBox.add_actor(this.twoFactorItem);

        /// Minutes
        this.minutesItem = widgets.createPopupImageMenuItem('', 'alarm-symbolic', () => { });
        this.userMenuItem.menuBox.add_actor(this.minutesItem);

        /// Packages
        this.packagesItem = widgets.createPopupImageMenuItem('', 'network-transmit-receive-symbolic', () => { });
        this.userMenuItem.menuBox.add_actor(this.packagesItem);

        /// Shared Storage
        this.sharedStorageItem = widgets.createPopupImageMenuItem('', 'network-server-symbolic', () => { });
        this.userMenuItem.menuBox.add_actor(this.sharedStorageItem);

        /// Starred
        this.starredMenuItem = new widgets.ExpandedMenuItem('starred-symbolic', '');
        this.menu.addMenuItem(this.starredMenuItem);

        /// Followers            
        this.followersMenuItem = new widgets.ExpandedMenuItem('system-users-symbolic', '');
        this.menu.addMenuItem(this.followersMenuItem);

        /// Following
        this.followingMenuItem = new widgets.ExpandedMenuItem('system-users-symbolic', '');
        this.menu.addMenuItem(this.followingMenuItem);

        if (!this.isCorrectState()) {
            return;
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /// Repository
        this.repositoryMenuItem = new widgets.ExpandedMenuItem('system-file-manager-symbolic', '', 'applications-internet-symbolic', () => utils.openUrl(this.repositoryUrl));
        this.menu.addMenuItem(this.repositoryMenuItem);

        /// Repository Latest Workflow Run
        this.infoItem = widgets.createPopupImageMenuItem('', 'media-playback-start-symbolic', () => utils.openUrl(this.workflowRunUrl));
        this.repositoryMenuItem.menuBox.add_actor(this.infoItem);

        /// Repository isPrivate
        this.repositoryPrivateItem = widgets.createPopupImageMenuItem('', 'changes-prevent-symbolic', () => { });
        this.repositoryMenuItem.menuBox.add_actor(this.repositoryPrivateItem);

        /// Repository isFork
        this.repositoryForkItem = widgets.createPopupImageMenuItem('', 'folder-remote-symbolic', () => { });
        this.repositoryMenuItem.menuBox.add_actor(this.repositoryForkItem);

        /// Stargazers
        this.stargazersMenuItem = new widgets.ExpandedMenuItem('starred-symbolic', '');
        this.menu.addMenuItem(this.stargazersMenuItem);

        /// Workflows
        this.workflowsMenuItem = new widgets.ExpandedMenuItem('mail-send-receive-symbolic', '');
        this.menu.addMenuItem(this.workflowsMenuItem);

        /// Runs
        this.runsMenuItem = new widgets.ExpandedMenuItem('media-playback-start-symbolic', '');
        this.menu.addMenuItem(this.runsMenuItem);

        /// Releases
        this.releasesMenuItem = new widgets.ExpandedMenuItem('folder-visiting-symbolic', '');
        this.menu.addMenuItem(this.releasesMenuItem);

        /// Artifacts
        this.artifactsMenuItem = new widgets.ExpandedMenuItem('folder-visiting-symbolic', '');
        this.menu.addMenuItem(this.artifactsMenuItem);
    }

    refreshTransfer(settings) {
        this.networkLabel.text = utils.fullDataConsumptionPerHour(settings);
    }

    /// Setters
    setLatestWorkflowRun(latestRun) {
        const status = latestRun["status"];
        const conclusion = latestRun["conclusion"] == null ? '' : latestRun["conclusion"];
        const displayTitle = latestRun["display_title"];
        const runNumber = latestRun["run_number"];
        const ownerAndRepo = latestRun["repository"]["full_name"];
        const isPrivate = latestRun["repository"]["private"];
        const isFork = latestRun["repository"]["fork"];
        const workflowRunUrl = latestRun["html_url"];
        const repositoryUrl = latestRun["repository"]["html_url"];
        const updatedAt = latestRun["updated_at"];
        const date = (new Date(updatedAt)).toLocaleFormat('%d %b %Y');

        this.workflowRunUrl = workflowRunUrl;
        this.repositoryUrl = repositoryUrl;

        const currentState = (status.toUpperCase() + ' ' + conclusion.toUpperCase()).replace('_', ' ');

        if (currentState == 'COMPLETED SUCCESS') {
            this.updateGithubActionsStatus(StatusBarState.COMPLETED_SUCCESS);
        } else if (currentState == 'COMPLETED FAILURE') {
            this.updateGithubActionsStatus(StatusBarState.COMPLETED_FAILURE);
        } else if (currentState == 'COMPLETED CANCELLED') {
            this.updateGithubActionsStatus(StatusBarState.COMPLETED_CANCELED);
        } else {
            this.updateGithubActionsStatus(StatusBarState.IN_PROGRESS);
        }

        if (this.repositoryMenuItem != null) {
            const conclusionIconName = workflowRunConclusionIcon(conclusion);
            this.repositoryMenuItem.label.text = ownerAndRepo;
            this.repositoryMenuItem.setStartIcon({ iconName: conclusionIconName });
            this.infoItem.setIcon(conclusionIconName);
        }

        if (this.repositoryPrivateItem != null) {
            this.repositoryPrivateItem.label.text = 'Private: ' + isPrivate;
        }

        if (this.repositoryForkItem != null) {
            this.repositoryForkItem.label.text = 'Fork: ' + isFork;
        }

        if (this.infoItem != null) {
            this.infoItem.label.text = '(#' + runNumber + ')' + ' - ' + date + ' - ' + displayTitle;
        }
    }

    // User ------------------------------------------------------------

    setUser(user) {
        let userEmail;
        let userName;
        let createdAt;
        let userUrl;
        let avatarUrl;
        let twoFactorEnabled;
        if (user != null) {
            userEmail = user['email'];
            userName = user['name'];
            createdAt = new Date(user['created_at']);
            userUrl = user['html_url'];
            avatarUrl = user['avatar_url'];
            twoFactorEnabled = user['two_factor_authentication'];
        }

        this.userUrl = userUrl;
        this.twoFactorEnabled = twoFactorEnabled;

        const userLabelText = (userName == null || userEmail == null) ? 'Not logged' : userName + ' (' + userEmail + ')'
            + '\n\nJoined GitHub on: ' + createdAt.toLocaleFormat('%d %b %Y');

        if (this.userMenuItem != null) {
            this.userMenuItem.icon.set_gicon(Gio.icon_new_for_string(avatarUrl));
            this.userMenuItem.icon.icon_size = 54;
            this.userMenuItem.label.text = userLabelText;
            this.userMenuItem.label.style = 'margin-left: 4px';
        }

        if (this.twoFactorItem != null) {
            this.twoFactorItem.label.text = '2FA: ' + (twoFactorEnabled == true ? 'Enabled' : 'Disabled');
        }
    }

    setUserBilling(minutes, packages, sharedStorage) {
        let parsedMinutes;
        if (minutes != null) {
            parsedMinutes = 'Usage minutes: ' + minutes['total_minutes_used'] + ' of ' + minutes['included_minutes'] + ', ' + minutes['total_paid_minutes_used'] + ' paid';
        }

        let parsedPackages;
        if (packages != null) {
            parsedPackages = 'Data transfer out: ' + packages['total_gigabytes_bandwidth_used'] + ' GB of ' + packages['included_gigabytes_bandwidth'] + ' GB, ' + packages['total_paid_gigabytes_bandwidth_used'] + ' GB paid';
        }

        let parsedSharedStorage;
        if (sharedStorage != null) {
            parsedSharedStorage = 'Storage for month: ' + sharedStorage['estimated_storage_for_month'] + ' GB, ' + sharedStorage['estimated_paid_storage_for_month'] + ' GB paid';
        }

        if (this.minutesItem != null) {
            this.minutesItem.label.text = parsedMinutes == null ? 'Not logged' : parsedMinutes;
        }

        if (this.packagesItem != null) {
            this.packagesItem.label.text = parsedPackages == null ? 'Not logged' : parsedPackages;
        }

        if (this.sharedStorageItem != null) {
            this.sharedStorageItem.label.text = parsedSharedStorage == null ? 'Not logged' : parsedSharedStorage;
        }
    }

    setUserStarred(starred) {
        function toItem(e) {
            return {
                "iconName": 'starred-symbolic',
                "text": e['full_name'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        if (this.starredMenuItem != null) {
            this.starredMenuItem.setHeaderItemText('Starred: ' + starred.length);
            this.starredMenuItem.submitItems(starred.map(e => toItem(e)));
        }
    }

    setUserFollowers(followers) {
        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        if (this.followersMenuItem != null) {
            this.followersMenuItem.setHeaderItemText('Followers: ' + followers.length);
            this.followersMenuItem.submitItems(followers.map(e => toItem(e)));
        }
    }

    setUserFollowing(following) {
        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        if (this.followingMenuItem != null) {
            this.followingMenuItem.setHeaderItemText('Following: ' + following.length);
            this.followingMenuItem.submitItems(following.map(e => toItem(e)));
        }
    }

    /// Separator ------------------------------------------------------

    setStargazers(stargazers) {
        function toItem(e) {
            return {
                "iconName": 'starred-symbolic',
                "text": e['login'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        if (this.stargazersMenuItem != null) {
            this.stargazersMenuItem.setHeaderItemText('Stargazers: ' + stargazers.length);
            this.stargazersMenuItem.submitItems(stargazers.map(e => toItem(e)));
        }
    }

    setWorkflows(workflows) {
        function toItem(e) {
            return {
                "iconName": 'mail-send-receive-symbolic',
                "text": e['name'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        if (this.workflowsMenuItem != null) {
            this.workflowsMenuItem.setHeaderItemText('Workflows: ' + workflows.length);
            this.workflowsMenuItem.submitItems(workflows.map(e => toItem(e)));
        }
    }

    setWorkflowRuns({ runs, onDeleteWorkflow }) {
        function toItem(e) {
            const conclusion = e['conclusion'];
            const id = e['id'];
            const runNumber = e["run_number"];
            const date = (new Date(e["updated_at"].toString())).toLocaleFormat('%d %b %Y');
            const displayTitle = e["display_title"].toString();

            const text = '(#' + runNumber + ')' + ' - ' + date + ' - ' + displayTitle;

            return {
                "iconName": workflowRunConclusionIcon(conclusion),
                "text": text,
                "callback": () => utils.openUrl(e['html_url']),
                "endIconName": 'application-exit-symbolic',
                "endIconCallback": () => {
                    widgets.showConfirmDialog({
                        title: 'Workflow run deletion',
                        description: 'Are you sure you want to delete this workflow run?',
                        itemTitle: date + ' - ' + e['display_title'],
                        itemDescription: e['name'],
                        iconName: workflowRunConclusionIcon(conclusion),
                        onConfirm: () => onDeleteWorkflow(id)
                    });
                }
            };
        }

        if (this.runsMenuItem != null) {
            this.runsMenuItem.setHeaderItemText('Workflow runs: ' + runs.length);
            this.runsMenuItem.submitItems(runs.map(e => toItem(e)));
        }
    }

    setReleases(releases) {
        function toItem(e) {
            return {
                "iconName": 'folder-visiting-symbolic',
                "text": e['name'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        if (this.releasesMenuItem != null) {
            this.releasesMenuItem.setHeaderItemText('Releases: ' + releases.length);
            this.releasesMenuItem.submitItems(releases.map(e => toItem(e)));
        }
    }

    setArtifacts(artifacts) {
        function toItem(e) {
            const date = (new Date(e['created_at'])).toLocaleFormat('%d %b %Y');
            const size = utils.bytesToString(e['size_in_bytes']);
            const filename = e['name'];
            const downloadUrl = e['archive_download_url'];
            const labelName = date + ' - ' + filename + ' - (' + size + ')' + (e['expired'] == true ? ' - expired' : '');

            function callback() {
                repository.downloadArtifact(downloadUrl, filename).then(success => {
                    try {
                        if (success === true) {
                            widgets.showNotification('The artifact: ' + filename + ' has been downloaded, check your home directory', true);
                        } else {
                            widgets.showNotification('Something went wrong :/', false);
                        }
                    } catch (e) {
                        logError(e);
                    }
                });
            }

            return {
                "iconName": 'folder-visiting-symbolic',
                "text": labelName,
                "callback": () => callback(),
            };
        }

        if (this.artifactsMenuItem != null) {
            this.artifactsMenuItem.setHeaderItemText('Artifacts: ' + artifacts.length);
            this.artifactsMenuItem.submitItems(artifacts.map(e => toItem(e)));
        }
    }
};