'use strict';

const { Clutter, GObject, St, Gio } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

const {
    isEmpty,
    openUrl,
    openInstallCliScreen,
    openAuthScreen,
    bytesToString,
    fullDataConsumptionPerHour,
    formatDate,
} = Me.imports.utils;

const {
    AppIconColor,
    appIcon,
    createAppGioIcon,
    RoundedButton,
    ExpandedMenuItem,
    IconPopupMenuItem,
    showConfirmDialog,
    showNotification,
    conclusionIconName,
} = Me.imports.widgets;

var StatusBarState = {
    NOT_INSTALLED_CLI: {
        text: () => 'Not installed CLI',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.GRAY,
    },
    NOT_LOGGED: {
        text: () => 'Not logged in',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.GRAY,
    },
    LOADING: {
        text: () => 'Loading',
        simpleModeShowText: false,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.BLUE,
    },
    LOGGED_NOT_CHOOSED_REPO: {
        text: () => 'No repo entered',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.RED,
    },
    INCORRECT_REPOSITORY: {
        text: () => 'Incorrect repository',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.RED,
    },
    IN_PROGRESS: {
        text: () => 'In progress',
        simpleModeShowText: false,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.BLUE,
    },
    REPO_WITHOUT_ACTIONS: {
        text: () => 'Repo without actions',
        simpleModeShowText: true,
        color: AppIconColor.GRAY,
        coloredModeColor: AppIconColor.GRAY,
    },
    COMPLETED_CANCELED: {
        text: () => 'Cancelled',
        simpleModeShowText: false,
        color: AppIconColor.RED,
        coloredModeColor: AppIconColor.RED,
    },
    COMPLETED_FAILURE: {
        text: () => 'Failure',
        simpleModeShowText: false,
        color: AppIconColor.RED,
        coloredModeColor: AppIconColor.RED,
    },
    COMPLETED_SUCCESS: {
        text: () => 'Success',
        simpleModeShowText: false,
        color: AppIconColor.WHITE,
        coloredModeColor: AppIconColor.GREEN,
    },
}

var StatusBarIndicator = class extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init(0.0, 'Github Action button', false);
    }

    constructor({
        simpleMode = false,
        coloredMode = false,
        uppercaseMode = false,
        isInstalledCli = false,
        isLogged = false,
        refreshCallback = () => { },
        logoutCallback = () => { },
        downloadArtifactCallback = (downloadUrl, filename) => { },
    }) {
        super();

        this.simpleMode = simpleMode;
        this.coloredMode = coloredMode;
        this.uppercaseMode = uppercaseMode;

        this.refreshCallback = refreshCallback;
        this.logoutCallback = logoutCallback;
        this.downloadArtifactCallback = downloadArtifactCallback;

        this.initStatusBarIndicator();

        if (isInstalledCli == false) {
            this.setState({ state: StatusBarState.NOT_INSTALLED_CLI });
            return;
        }

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

    setUppercaseMode = (mode) => {
        this.uppercaseMode = mode;
        this.refreshState();
    };

    isCorrectState = () => {
        return this.state == StatusBarState.IN_PROGRESS
            || this.state == StatusBarState.REPO_WITHOUT_ACTIONS
            || this.state == StatusBarState.COMPLETED_CANCELED
            || this.state == StatusBarState.COMPLETED_FAILURE
            || this.state == StatusBarState.COMPLETED_SUCCESS;
    }

    isInstalledCli = () => {
        return this.state != StatusBarState.NOT_INSTALLED_CLI;
    }

    isLogged = () => {
        if (this.state == StatusBarState.NOT_INSTALLED_CLI) {
            return false;
        };

        if (this.state == StatusBarState.NOT_LOGGED) {
            return false;
        };

        return true;
    }

    shouldShowCompletedNotification(previousState, currentState) {
        return previousState === StatusBarState.IN_PROGRESS
            && (currentState === StatusBarState.COMPLETED_SUCCESS
                || currentState === StatusBarState.COMPLETED_FAILURE
                || currentState === StatusBarState.COMPLETED_CANCELED);
    }

    updateGithubActionsStatus(statusBarState) {
        if (this.simpleMode == true && statusBarState.simpleModeShowText == false) {
            this.label.text = '';
        } else {
            this.label.text = this.uppercaseMode == true
                ? statusBarState.text().toUpperCase()
                : statusBarState.text();
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

        this.icon.gicon = createAppGioIcon(appIconColor);
    }

    refreshBoredIcon() {
        this.boredButton.child = new St.Icon({ gicon: appIcon() });
    }

    refreshState() {
        this.setState({ state: this.state, forceUpdate: true });
    }

    setState({ state, forceUpdate = false }) {
        if (state == null || state == undefined) {
            return;
        }

        if (this.state == state && forceUpdate == false) {
            return;
        }

        this.state = state;
        this.updateGithubActionsStatus(state);

        this.menu.removeAll();
        this.initPopupMenu();

        if (this.state == StatusBarState.NOT_INSTALLED_CLI) {
            return;
        }

        if (this.state == StatusBarState.NOT_LOGGED) {
            return;
        }

        this.setLoadingTexts();

        if (this.state == StatusBarState.LOADING) {
            return;
        }

        this.refreshCallback();
    }

    setLoadingTexts() {
        const loadingText = StatusBarState.LOADING.text();

        this.userMenuItem?.setHeaderItemText(loadingText)
        this.starredMenuItem?.setHeaderItemText(loadingText)
        this.followersMenuItem?.setHeaderItemText(loadingText);
        this.followingMenuItem?.setHeaderItemText(loadingText);
        this.reposMenuItem?.setHeaderItemText(loadingText);
        this.repositoryMenuItem?.setHeaderItemText(loadingText);
        this.stargazersMenuItem?.setHeaderItemText(loadingText);
        this.workflowsMenuItem?.setHeaderItemText(loadingText);
        this.runsMenuItem?.setHeaderItemText(loadingText);
        this.releasesMenuItem?.setHeaderItemText(loadingText);
        this.branchesMenuItem?.setHeaderItemText(loadingText);
        this.artifactsMenuItem?.setHeaderItemText(loadingText);
        this.twoFactorItem?.label.set_text(loadingText);
        this.minutesItem?.label.set_text(loadingText);
        this.packagesItem?.label.set_text(loadingText);
        this.sharedStorageItem?.label.set_text(loadingText);
        this.repositoryPrivateItem?.label.set_text(loadingText);
        this.repositoryForkItem?.label.set_text(loadingText);
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
        this.boredButton = new RoundedButton({ icon: new St.Icon({ gicon: createAppGioIcon(AppIconColor.WHITE) }) });
        this.boredButton.connect('clicked', () => openUrl('https://api.github.com/octocat'));
        this.rightBox.add_actor(this.boredButton);

        /// Settings
        this.settingsItem = new RoundedButton({ iconName: 'system-settings-symbolic' });
        this.settingsItem.connect('clicked', () => ExtensionUtils.openPrefs());
        this.rightBox.add_actor(this.settingsItem);

        if (this.isInstalledCli() == false) {
            this.installButton = new RoundedButton({ iconName: 'application-x-addon-symbolic' });
            this.installButton.connect('clicked', () => openInstallCliScreen());
            this.rightBox.add_actor(this.installButton);
        } else if (this.isLogged()) {
            /// Refresh
            this.refreshButton = new RoundedButton({ iconName: 'view-refresh-symbolic' });
            this.refreshButton.connect('clicked', () => this.refreshCallback());
            this.rightBox.add_actor(this.refreshButton);

            /// Logout
            this.logoutButton = new RoundedButton({ iconName: 'system-log-out-symbolic' });
            this.logoutButton.connect('clicked', async () => this.logoutCallback());
            this.rightBox.add_actor(this.logoutButton);
        } else {
            /// Login
            this.loginButton = new RoundedButton({ iconName: 'avatar-default-symbolic' });
            this.loginButton.connect('clicked', () => openAuthScreen());
            this.rightBox.add_actor(this.loginButton);
        }

        /// Logged Menu
        if (this.isLogged()) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.initLoggedMenu();
        }
    }

    initLoggedMenu() {
        /// User
        this.userMenuItem = new ExpandedMenuItem(null, '');
        this.menu.addMenuItem(this.userMenuItem);

        /// 2 FA
        this.twoFactorCallback = () => this.twoFactorEnabled == false ? openUrl('https://github.com/settings/two_factor_authentication/setup/intro') : {};
        this.twoFactorItem = new IconPopupMenuItem({
            startIconName: 'security-medium-symbolic',
            itemCallback: this.twoFactorCallback,
        });
        this.userMenuItem.menuBox.add_actor(this.twoFactorItem);

        /// Minutes
        this.minutesItem = new IconPopupMenuItem({ startIconName: 'alarm-symbolic' });
        this.userMenuItem.menuBox.add_actor(this.minutesItem);

        /// Packages
        this.packagesItem = new IconPopupMenuItem({ startIconName: 'network-transmit-receive-symbolic' });
        this.userMenuItem.menuBox.add_actor(this.packagesItem);

        /// Shared Storage
        this.sharedStorageItem = new IconPopupMenuItem({ startIconName: 'network-server-symbolic' });
        this.userMenuItem.menuBox.add_actor(this.sharedStorageItem);

        /// Starred
        this.starredMenuItem = new ExpandedMenuItem('starred-symbolic', '');
        this.menu.addMenuItem(this.starredMenuItem);

        /// Followers            
        this.followersMenuItem = new ExpandedMenuItem('system-users-symbolic', '');
        this.menu.addMenuItem(this.followersMenuItem);

        /// Following
        this.followingMenuItem = new ExpandedMenuItem('system-users-symbolic', '');
        this.menu.addMenuItem(this.followingMenuItem);

        /// Repos
        this.reposMenuItem = new ExpandedMenuItem('folder-symbolic', '');
        this.menu.addMenuItem(this.reposMenuItem);

        if (!this.isCorrectState()) {
            return;
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /// Repository
        this.repositoryMenuItem = new ExpandedMenuItem('system-file-manager-symbolic', '', 'applications-internet-symbolic', () => openUrl(this.repositoryUrl));
        this.menu.addMenuItem(this.repositoryMenuItem);

        /// Repository isPrivate
        this.repositoryPrivateItem = new IconPopupMenuItem({ startIconName: 'changes-prevent-symbolic' });
        this.repositoryMenuItem.menuBox.add_actor(this.repositoryPrivateItem);

        /// Repository isFork
        this.repositoryForkItem = new IconPopupMenuItem({ startIconName: 'folder-remote-symbolic' });
        this.repositoryMenuItem.menuBox.add_actor(this.repositoryForkItem);

        /// Branches
        this.branchesMenuItem = new ExpandedMenuItem('media-playlist-consecutive-symbolic', '');
        this.menu.addMenuItem(this.branchesMenuItem);

        /// Stargazers
        this.stargazersMenuItem = new ExpandedMenuItem('starred-symbolic', '');
        this.menu.addMenuItem(this.stargazersMenuItem);

        /// Workflows
        this.workflowsMenuItem = new ExpandedMenuItem('mail-send-receive-symbolic', '');
        this.menu.addMenuItem(this.workflowsMenuItem);

        /// Runs
        this.runsMenuItem = new ExpandedMenuItem('media-playback-start-symbolic', '');
        this.menu.addMenuItem(this.runsMenuItem);

        /// Releases
        this.releasesMenuItem = new ExpandedMenuItem('folder-visiting-symbolic', '');
        this.menu.addMenuItem(this.releasesMenuItem);

        /// Artifacts
        this.artifactsMenuItem = new ExpandedMenuItem('folder-visiting-symbolic', '');
        this.menu.addMenuItem(this.artifactsMenuItem);
    }

    refreshTransfer(settings) {
        this.networkLabel.text = fullDataConsumptionPerHour(settings);
    }

    /// Setters
    setLatestWorkflowRun(run) {
        const conclusion = run["conclusion"];

        if (conclusion == 'success') {
            this.setState({ state: StatusBarState.COMPLETED_SUCCESS });
        } else if (conclusion == 'failure') {
            this.setState({ state: StatusBarState.COMPLETED_FAILURE });
        } else if (conclusion == 'cancelled') {
            this.setState({ state: StatusBarState.COMPLETED_CANCELED });
        } else {
            this.setState({ state: StatusBarState.IN_PROGRESS });
        }

        if (this.repositoryMenuItem != null) {
            this.repositoryMenuItem.setStartIcon({ iconName: conclusionIconName(conclusion) });
            this.repositoryMenuItem.icon.icon_size = 22;
        }
    }

    /// User ------------------------------------------------------------

    setUser(user) {
        const userEmail = user['email'];
        const userName = user['name'];
        const createdAt = user['created_at'];
        const userUrl = user['html_url'];
        const avatarUrl = user['avatar_url'];
        const twoFactorEnabled = user['two_factor_authentication'];

        this.userUrl = userUrl;
        this.twoFactorEnabled = twoFactorEnabled;

        const userLabelText = (userName == null || userEmail == null)
            ? 'Not logged'
            : `${userName} (${userEmail})\n\nJoined GitHub on: ${formatDate(createdAt)}`;

        if (this.userMenuItem != null) {
            this.userMenuItem.icon.set_gicon(Gio.icon_new_for_string(avatarUrl));
            this.userMenuItem.icon.icon_size = 54;
            this.userMenuItem.label.text = userLabelText;
            this.userMenuItem.label.style = 'margin-left: 4px';
        }

        if (this.twoFactorItem != null) {
            this.twoFactorItem.label.text = `2FA: ${(twoFactorEnabled == true ? 'Enabled' : 'Disabled')}`;
        }
    }

    setUserBilling(minutes, packages, sharedStorage) {
        let parsedMinutes;
        if (minutes != null) {
            parsedMinutes = `Usage minutes: ${minutes['total_minutes_used']} of ${minutes['included_minutes']}, ${minutes['total_paid_minutes_used']} paid`;
        }

        let parsedPackages;
        if (packages != null) {
            parsedPackages = `Data transfer out: ${packages['total_gigabytes_bandwidth_used']} GB of ${packages['included_gigabytes_bandwidth']} GB, ${packages['total_paid_gigabytes_bandwidth_used']} GB paid`;
        }

        let parsedSharedStorage;
        if (sharedStorage != null) {
            parsedSharedStorage = `Storage for month: ${sharedStorage['estimated_storage_for_month']} GB, ${sharedStorage['estimated_paid_storage_for_month']} GB paid`;
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
                "callback": () => openUrl(e['html_url']),
            };
        }

        if (this.starredMenuItem != null) {
            this.starredMenuItem.setHeaderItemText(`Starred: ${starred.length}`);
            this.starredMenuItem.submitItems(starred.map(e => toItem(e)));
        }
    }

    setUserFollowers(followers) {
        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => openUrl(e['html_url']),
            };
        }

        if (this.followersMenuItem != null) {
            this.followersMenuItem.setHeaderItemText(`Followers: ${followers.length}`);
            this.followersMenuItem.submitItems(followers.map(e => toItem(e)));
        }
    }

    setUserFollowing(following) {
        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => openUrl(e['html_url']),
            };
        }

        if (this.followingMenuItem != null) {
            this.followingMenuItem.setHeaderItemText(`Following: ${following.length}`);
            this.followingMenuItem.submitItems(following.map(e => toItem(e)));
        }
    }

    setUserRepos(repos, onWatchCallback) {
        function toItem(e) {
            const visibility = e['visibility'];
            const createdAt = formatDate(e['created_at']);
            const name = e['name'];
            const owner = e['owner']['login'];

            return {
                "iconName": 'folder-symbolic',
                "text": `${createdAt} - (${visibility}) - ${name}`,
                "callback": () => openUrl(e['html_url']),
                "endButtonText": 'Watch',
                "endButtonCallback": () => onWatchCallback(owner, name),
            };
        }

        if (this.reposMenuItem != null) {
            this.reposMenuItem.setHeaderItemText(`Repos: ${repos.length}`);
            this.reposMenuItem.submitItems(
                repos
                    .sort((a, b) => (new Date(b['created_at'])).getTime() - (new Date(a['created_at'])).getTime())
                    .map(e => toItem(e)));
        }
    }

    /// Separator ------------------------------------------------------

    setWatchedRepo(repo) {
        if (this.repositoryMenuItem != null) {
            this.repositoryMenuItem.label.style = 'margin-left: 4px';
            this.repositoryMenuItem.label.text = `${repo['full_name']}\n\nCreated at: ${formatDate(repo['created_at'])}`;

            this.repositoryUrl = repo['html_url'];
        }

        if (this.repositoryPrivateItem != null) {
            this.repositoryPrivateItem.label.text = `Private: ${(repo["private"] == true).toString()}`;
        }

        if (this.repositoryForkItem != null) {
            this.repositoryForkItem.label.text = `Fork: ${(repo["fork"] == true).toString()}`;
        }
    }

    setStargazers(stargazers) {
        function toItem(e) {
            return {
                "iconName": 'starred-symbolic',
                "text": e['login'],
                "callback": () => openUrl(e['html_url']),
            };
        }

        if (this.stargazersMenuItem != null) {
            this.stargazersMenuItem.setHeaderItemText(`Stargazers: ${stargazers.length}`);
            this.stargazersMenuItem.submitItems(stargazers.map(e => toItem(e)));
        }
    }

    setWorkflows(workflows) {
        function toItem(e) {
            return {
                "iconName": 'mail-send-receive-symbolic',
                "text": e['name'],
                "callback": () => openUrl(e['html_url']),
            };
        }

        if (this.workflowsMenuItem != null) {
            this.workflowsMenuItem.setHeaderItemText(`Workflows: ${workflows.length}`);
            this.workflowsMenuItem.submitItems(workflows.map(e => toItem(e)));
        }
    }

    setWorkflowRuns({ runs, onDeleteWorkflow }) {
        function toItem(e) {
            const conclusion = e['conclusion'];
            const id = e['id'];
            const runNumber = e["run_number"];
            const updatedAt = e["updated_at"];
            const displayTitle = e["display_title"];
            const name = e["name"];
            const htmlUrl = e['html_url'];

            const date = formatDate(updatedAt);
            const text = `(#${runNumber}) - ${date} - ${displayTitle}`;

            const iconName = conclusionIconName(conclusion);

            return {
                "iconName": iconName,
                "text": text,
                "callback": () => openUrl(htmlUrl),
                "endIconName": 'application-exit-symbolic',
                "endIconCallback": () => {
                    showConfirmDialog({
                        title: 'Workflow run deletion',
                        description: 'Are you sure you want to delete this workflow run?',
                        itemTitle: `${date} - ${displayTitle}`,
                        itemDescription: name,
                        iconName: iconName,
                        onConfirm: () => onDeleteWorkflow(id, `${displayTitle} ${name}`),
                    });
                }
            };
        }

        if (this.runsMenuItem != null) {
            this.runsMenuItem.setHeaderItemText(`Workflow runs: ${runs.length}`);
            this.runsMenuItem.submitItems(runs.map(e => toItem(e)));
        }
    }

    setReleases(releases) {
        function toItem(e) {
            return {
                "iconName": 'folder-visiting-symbolic',
                "text": e['name'],
                "callback": () => openUrl(e['html_url']),
            };
        }

        if (this.releasesMenuItem != null) {
            this.releasesMenuItem.setHeaderItemText(`Releases: ${releases.length}`);
            this.releasesMenuItem.submitItems(releases.map(e => toItem(e)));
        }
    }

    setArtifacts(artifacts) {
        const self = this;

        function toItem(e) {
            const createdAt = e['created_at'];
            const size = bytesToString(e['size_in_bytes']);
            const filename = e['name'];
            const downloadUrl = e['archive_download_url'];
            const labelName = `${formatDate(createdAt)} - ${filename} - (${size}) ${(e['expired'] == true ? ' - expired' : '')}`;

            return {
                "iconName": 'folder-visiting-symbolic',
                "text": labelName,
                "callback": () => self.downloadArtifactCallback(downloadUrl, filename),
            };
        }

        if (this.artifactsMenuItem != null) {
            this.artifactsMenuItem.setHeaderItemText(`Artifacts: ${artifacts.length}`);
            this.artifactsMenuItem.submitItems(artifacts.map(e => toItem(e)));
        }
    }

    setBranches(branches) {
        const repositoryUrl = this.repositoryUrl;

        function toItem(e) {
            return {
                "iconName": 'media-playlist-consecutive-symbolic',
                "text": e['name'],
                "callback": () => openUrl(repositoryUrl),
                "endIconName": e['protected'] ? 'changes-prevent-symbolic' : null,
            };
        }

        if (this.branchesMenuItem != null) {
            this.branchesMenuItem.setHeaderItemText(`Branches: ${branches.length}`);
            this.branchesMenuItem.submitItems(branches.map(e => toItem(e)));
        }
    }
};