'use strict';

const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const MessageTray = imports.ui.messageTray;

const GETTEXT_DOMAIN = 'github-actions-extension';
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;
const repository = Me.imports.data_repository;
const _ = ExtensionUtils.gettext;

var LOADING_TEXT = 'Loading';
var NOT_LOGGED_IN_TEXT = 'Not logged in';

function createPopupImageMenuItem(text, iconName, callback) {
    const item = new PopupMenu.PopupImageMenuItem(text, iconName);
    item.connect('activate', () => callback());
    return item;
}

function createRoundButton({ icon, iconName }) {
    const button = new St.Button({ style_class: 'button github-actions-button-action' });
    if (icon != null) {
        button.child = icon;
    }
    if (iconName != null) {
        button.child = new St.Icon({ icon_name: iconName });
    }
    return button;
}

const ExpandedMenuItem = GObject.registerClass(
    class ExpandedMenuItem extends PopupMenu.PopupSubMenuMenuItem {
        constructor(iconName, text) {
            super('');

            this.menuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.scrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.scrollView.add_actor(this.menuBox);
            this.menu.box.add_actor(this.scrollView);

            this.label = new St.Label({ text: text });
            this.insert_child_at_index(this.label, 0);

            this.iconContainer = new St.Widget({ style_class: 'popup-menu-icon-container' });
            this.insert_child_at_index(this.iconContainer, 0);

            this.icon = new St.Icon({ icon_name: iconName, style_class: 'popup-menu-icon' });
            this.iconContainer.add_child(this.icon);
        }
    }
);

var StatusBarIndicator = class StatusBarIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Github Action button', false);
    }

    constructor(refreshCallback) {
        super();
        this.refreshCallback = refreshCallback;
        this.initState();
        this.initStatusButton();
        this.initPopupMenu(this.isLogged);
    }

    initStatusButton() {
        this.label = new St.Label({ style_class: 'github-actions-label', text: LOADING_TEXT, y_align: Clutter.ActorAlign.CENTER, y_expand: true });

        this.icon = new St.Icon({ style_class: 'system-status-icon' });
        this.setStatusIconMode('in_progress');

        this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.topBox.add_child(this.icon);
        this.topBox.add_child(this.label);
        this.add_child(this.topBox);
    }

    setStatusIconMode(mode) {
        if (mode == 'error') {
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github_red.svg`);
        } else if (mode == 'in_progress') {
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github_gray.svg`);
        } else if (mode == 'success') {
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github_white.svg`);
        }
    }

    refreshBoredIcon() {
        const darkTheme = utils.isDarkTheme();

        if (darkTheme) {
            this.boredButton.child = new St.Icon({ gicon: Gio.icon_new_for_string(`${Me.path}/github_white.svg`) });
        } else {
            this.boredButton.child = new St.Icon({ gicon: Gio.icon_new_for_string(`${Me.path}/github_black.svg`) });
        }
    }

    initPopupMenu(isLogged) {
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

        /// Network transfer
        this.networkContainer = new St.BoxLayout();
        this.networkButton = new St.Button({ style_class: 'button github-actions-button-action' });
        this.networkIcon = new St.Icon({ icon_name: 'network-wireless-symbolic', icon_size: 20 });
        this.networkLabel = new St.Label();
        this.networkLabel.style = 'margin-left: 8px; margin-top: 2px;';
        this.networkContainer.add(this.networkIcon);
        this.networkContainer.add(this.networkLabel);
        this.networkButton.set_child(this.networkContainer);
        this.leftBox.add(this.networkButton);

        this.bottomItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.bottomItem.remove_all_children(); // Remove left margin from non visible PopupMenuItem icon
        this.bottomItem.actor.add_actor(this.box);
        this.menu.addMenuItem(this.bottomItem);

        /// Refresh
        this.refreshButton = createRoundButton({ iconName: 'view-refresh-symbolic' });
        this.refreshButton.connect('clicked', (self) => this.refreshCallback());
        this.rightBox.add_actor(this.refreshButton);

        /// Bored
        this.boredButton = createRoundButton({ icon: new St.Icon({ gicon: Gio.icon_new_for_string(`${Me.path}/github_white.svg`) }) });
        this.boredButton.connect('clicked', (self) => utils.openUrl('https://api.github.com/octocat'));
        this.rightBox.add_actor(this.boredButton);

        /// Settings
        this.settingsItem = createRoundButton({ iconName: 'system-settings-symbolic' });
        this.settingsItem.connect('clicked', (self) => ExtensionUtils.openPrefs());
        this.rightBox.add_actor(this.settingsItem);

        if (isLogged == true) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.initLoggedMenu();
        }
    }

    initLoggedMenu() {
        /// User
        this.userMenuItem = new ExpandedMenuItem(null, LOADING_TEXT);
        this.menu.addMenuItem(this.userMenuItem);

        /// 2 FA
        this.twoFactorCallback = () => this.twoFactorEnabled == false ? utils.openUrl('https://github.com/settings/two_factor_authentication/setup/intro') : {};
        this.twoFactorItem = createPopupImageMenuItem(LOADING_TEXT, 'security-medium-symbolic', this.twoFactorCallback);
        this.userMenuItem.menuBox.add_actor(this.twoFactorItem);

        /// Minutes
        this.minutesItem = createPopupImageMenuItem(LOADING_TEXT, 'alarm-symbolic', () => { });
        this.userMenuItem.menuBox.add_actor(this.minutesItem);

        /// Packages
        this.packagesItem = createPopupImageMenuItem(LOADING_TEXT, 'network-transmit-receive-symbolic', () => { });
        this.userMenuItem.menuBox.add_actor(this.packagesItem);

        /// Shared Storage
        this.sharedStorageItem = createPopupImageMenuItem(LOADING_TEXT, 'network-server-symbolic', () => { });
        this.userMenuItem.menuBox.add_actor(this.sharedStorageItem);

        /// Starred
        this.starredMenuItem = new ExpandedMenuItem('starred-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.starredMenuItem);

        /// Followers            
        this.followersMenuItem = new ExpandedMenuItem('system-users-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.followersMenuItem);

        /// Following
        this.followingMenuItem = new ExpandedMenuItem('system-users-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.followingMenuItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /// Repository
        this.repositoryMenuItem = new ExpandedMenuItem('system-file-manager-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.repositoryMenuItem);

        /// Repository Open
        this.openRepositoryItem = createPopupImageMenuItem('Open', 'applications-internet-symbolic', () => utils.openUrl(this.repositoryUrl));
        this.repositoryMenuItem.menuBox.add_actor(this.openRepositoryItem);

        /// Repository Last commit
        this.infoItem = createPopupImageMenuItem(LOADING_TEXT, 'object-flip-vertical-symbolic', () => utils.openUrl(this.workflowUrl));
        this.repositoryMenuItem.menuBox.add_actor(this.infoItem);

        /// Stargazers
        this.stargazersMenuItem = new ExpandedMenuItem('starred-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.stargazersMenuItem);

        /// Workflows
        this.workflowsMenuItem = new ExpandedMenuItem('mail-send-receive-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.workflowsMenuItem);

        /// Runs
        this.runsMenuItem = new ExpandedMenuItem('media-playback-start-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.runsMenuItem);

        /// Artifacts
        this.artifactsMenuItem = new ExpandedMenuItem('insert-object-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.artifactsMenuItem);

        /// Releases
        this.releasesMenuItem = new ExpandedMenuItem('folder-download-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.releasesMenuItem);
    }

    refreshTransfer(settings, isLogged) {
        if (isLogged == true) {
            this.networkLabel.text = utils.fullDataConsumptionPerHour(settings);
        }
    }

    refreshAuthState(isLogged) {
        if (this.isLogged == false) {
            this.label.text = NOT_LOGGED_IN_TEXT;
        }

        if (this.isLogged == isLogged) return;
        this.isLogged = isLogged;

        this.menu.removeAll();
        this.initPopupMenu(this.isLogged);
    }

    initState() {
        this.workflowUrl = "";
        this.repositoryUrl = "";
        this.userUrl = "";
        this.twoFactorEnabled = false;
        this.isLogged = false;
    }

    /// Setters
    setLatestRun(latestRun) {
        const status = latestRun["status"].toString().toUpperCase();
        const conclusion = latestRun["conclusion"] == null ? '' : latestRun["conclusion"].toString().toUpperCase();
        const displayTitle = latestRun["display_title"].toString();
        const runNumber = latestRun["run_number"].toString();
        const updatedAt = latestRun["updated_at"].toString();
        const ownerAndRepo = latestRun["repository"]["full_name"].toString();
        const workflowUrl = latestRun["html_url"].toString();
        const repositoryUrl = latestRun["repository"]["html_url"].toString();
        const date = new Date(updatedAt);

        const currentState = status + ' ' + conclusion;

        if (currentState == 'COMPLETED SUCCESS') {
            this.setStatusIconMode('success');
        } else if (currentState == 'COMPLETED FAILURE' || currentState == 'COMPLETED CANCELLED') {
            this.setStatusIconMode('error');
        } else {
            this.setStatusIconMode(['in_progress']);
        }

        this.label.text = currentState;
        this.workflowUrl = workflowUrl;
        this.repositoryUrl = repositoryUrl;
        this.repositoryMenuItem.label.text = ownerAndRepo;
        this.infoItem.label.text = date.toUTCString() + "\n\n#" + runNumber + " " + displayTitle;
    }

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
        this.userMenuItem.label.text = (userName == null || userEmail == null) ? 'Not logged' : userName + ' (' + userEmail + ')'
            + '\n\nJoined GitHub on: ' + createdAt.toLocaleFormat('%d %b %Y');

        this.twoFactorEnabled = twoFactorEnabled;
        this.twoFactorItem.label.text = '2FA: ' + (twoFactorEnabled == true ? 'Enabled' : 'Disabled');

        this.userMenuItem.icon.set_gicon(Gio.icon_new_for_string(avatarUrl));
        this.userMenuItem.icon.icon_size = 54;
        this.userMenuItem.label.style = 'margin-left: 4px';
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

        this.minutesItem.label.text = parsedMinutes == null ? 'Not logged' : parsedMinutes;
        this.packagesItem.label.text = parsedPackages == null ? 'Not logged' : parsedPackages;
        this.sharedStorageItem.label.text = parsedSharedStorage == null ? 'Not logged' : parsedSharedStorage;
    }

    setWorkflows(workflows) {
        this.workflowsMenuItem.menuBox.remove_all_children();
        this.workflowsMenuItem.label.text = 'Workflows: ' + workflows.length;

        workflows.forEach((element) => {
            const item = new PopupMenu.PopupImageMenuItem(element['name'], 'mail-send-receive-symbolic');
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.workflowsMenuItem.menuBox.add_actor(item);
        });
    }

    setArtifacts(artifacts) {
        this.artifactsMenuItem.menuBox.remove_all_children();
        this.artifactsMenuItem.label.text = 'Artifacts: ' + artifacts.length;

        artifacts.forEach((element) => {
            const date = (new Date(element['created_at'])).toLocaleFormat('%d %b %Y');
            const size = utils.bytesToString(element['size_in_bytes']);
            const filename = element['name'];
            const downloadUrl = element['archive_download_url'];

            const labelName = date + ' - ' + filename + ' - (' + size + ')' + (element['expired'] == true ? ' - expired' : '');

            const item = new PopupMenu.PopupImageMenuItem(labelName, 'insert-object-symbolic');
            item.connect('activate', () => {
                repository.downloadArtifact(downloadUrl, filename).then(success => {
                    try {
                        if (success === true) {
                            utils.showNotification('The artifact: ' + filename + ' has been downloaded, check your home directory', true);
                        } else {
                            utils.showNotification('Something went wrong :/', false);
                        }
                    } catch (e) {
                        logError(e);
                    }
                });

            });
            this.artifactsMenuItem.menuBox.add_actor(item);
        });
    }

    setStargazers(stargazers) {
        this.stargazersMenuItem.menuBox.remove_all_children();
        this.stargazersMenuItem.label.text = 'Stargazers: ' + stargazers.length;

        stargazers.forEach((element) => {
            const item = new PopupMenu.PopupImageMenuItem(element['login'], 'starred-symbolic');
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.stargazersMenuItem.menuBox.add_actor(item);
        });
    }

    setRuns(runs) {
        this.runsMenuItem.menuBox.remove_all_children();
        this.runsMenuItem.label.text = 'Runs: ' + runs.length;

        runs.forEach((element) => {
            const conclusion = element['conclusion'];

            let iconName;
            if (conclusion == 'success') {
                iconName = 'emblem-default'
            } else if (conclusion == 'failure') {
                iconName = 'emblem-unreadable';
            } else {
                iconName = 'emblem-synchronizing';
            }

            const item = new PopupMenu.PopupImageMenuItem(element['display_title'], iconName);
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.runsMenuItem.menuBox.add_actor(item);
        });
    }

    setUserStarred(starred) {
        this.starredMenuItem.menuBox.remove_all_children();
        this.starredMenuItem.label.text = 'Starred: ' + starred.length;

        starred.forEach((element) => {
            const item = new PopupMenu.PopupImageMenuItem(element['full_name'], 'starred-symbolic');
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.starredMenuItem.menuBox.add_actor(item);
        });
    }

    setUserFollowers(followers) {
        this.followersMenuItem.menuBox.remove_all_children();
        this.followersMenuItem.label.text = 'Followers: ' + followers.length;

        followers.forEach((element) => {
            const item = new PopupMenu.PopupImageMenuItem(element['login'], 'system-users-symbolic');
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.followersMenuItem.menuBox.add_actor(item);
        });
    }

    setUserFollowing(following) {
        this.followingMenuItem.menuBox.remove_all_children();
        this.followingMenuItem.label.text = 'Following: ' + following.length;

        following.forEach((element) => {
            const item = new PopupMenu.PopupImageMenuItem(element['login'], 'system-users-symbolic');
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.followingMenuItem.menuBox.add_actor(item);
        });
    }

    setReleases(releases) {
        this.releasesMenuItem.menuBox.remove_all_children();
        this.releasesMenuItem.label.text = 'Releases: ' + releases.length;

        releases.forEach((element) => {
            const item = new PopupMenu.PopupImageMenuItem(element['name'], 'folder-download-symbolic');
            item.connect('activate', () => utils.openUrl(element['html_url']));
            this.releasesMenuItem.menuBox.add_actor(item);
        });
    }
};