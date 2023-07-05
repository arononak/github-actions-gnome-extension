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

function createPopupImageMenuItem(text, startIconName, itemCallback, endIconName, endIconCallback) {
    const item = new PopupMenu.PopupImageMenuItem(text, startIconName);
    item.connect('activate', () => itemCallback());

    if (endIconName != null) {
        const icon = new IconButton(endIconName, () => endIconCallback())
        const box = new St.BoxLayout({
            style_class: 'github-actions-top-box',
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add(icon);
        item.insert_child_at_index(box, 100);
    }

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
        constructor(startIconName, text, endIconName, endIconCallback) {
            super('');

            this.menuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.scrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.scrollView.add_actor(this.menuBox);
            this.menu.box.add_actor(this.scrollView);

            this.label = new St.Label({ text: text });
            this.insert_child_at_index(this.label, 0);

            this.iconContainer = new St.Widget({ style_class: 'popup-menu-icon-container' });
            this.insert_child_at_index(this.iconContainer, 0);
            this.icon = new St.Icon({ icon_name: startIconName, style_class: 'popup-menu-icon' });
            this.iconContainer.add_child(this.icon);

            if (endIconName != null) {
                const endIcon = new IconButton(endIconName, () => endIconCallback())
                const box = new St.BoxLayout({
                    style_class: 'github-actions-top-box',
                    vertical: false,
                    x_expand: true,
                    x_align: Clutter.ActorAlign.END,
                    y_align: Clutter.ActorAlign.CENTER,
                });
                box.add(endIcon);
                this.insert_child_at_index(box, 5);
            }
        }

        submitItems(items) {
            this.menuBox.remove_all_children();

            items.forEach((i) => {
                this.menuBox.add_actor(createPopupImageMenuItem(i['text'], i['iconName'], i['callback']));
            });
        }

        setHeaderItemText(text) {
            this.label.text = text;
        }
    }
);

var IconButton = class extends St.Button {
    static {
        GObject.registerClass(this);
    }

    constructor(iconName, callback) {
        super();
        this.connect('clicked', callback);
        this.set_can_focus(true);
        this.set_child(new St.Icon({ style_class: 'popup-menu-icon', iconName }));
    }

    setIcon(icon) {
        this.child.set_icon_name(icon);
    }
};

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
        this.setStatusIconState('in_progress');

        this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.topBox.add_child(this.icon);
        this.topBox.add_child(this.label);
        this.add_child(this.topBox);
    }

    setStatusIconState(state) {
        if (state == 'error') {
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github_red.svg`);
        } else if (state == 'in_progress') {
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github_gray.svg`);
        } else if (state == 'success') {
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

        /// Bored
        this.boredButton = createRoundButton({ icon: new St.Icon({ gicon: Gio.icon_new_for_string(`${Me.path}/github_white.svg`) }) });
        this.boredButton.connect('clicked', (self) => utils.openUrl('https://api.github.com/octocat'));
        this.rightBox.add_actor(this.boredButton);

        /// Refresh
        this.refreshButton = createRoundButton({ iconName: 'view-refresh-symbolic' });
        this.refreshButton.connect('clicked', (self) => this.refreshCallback());
        this.rightBox.add_actor(this.refreshButton);

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
        this.repositoryMenuItem = new ExpandedMenuItem('system-file-manager-symbolic', LOADING_TEXT, 'applications-internet-symbolic', () => utils.openUrl(this.repositoryUrl));
        this.menu.addMenuItem(this.repositoryMenuItem);

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

        /// Releases
        this.releasesMenuItem = new ExpandedMenuItem('folder-visiting-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.releasesMenuItem);

        /// Artifacts
        this.artifactsMenuItem = new ExpandedMenuItem('folder-visiting-symbolic', LOADING_TEXT);
        this.menu.addMenuItem(this.artifactsMenuItem);
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
        const date = (new Date(updatedAt)).toLocaleFormat('%d %b %Y');

        const currentState = status + ' ' + conclusion;

        if (currentState == 'COMPLETED SUCCESS') {
            this.setStatusIconState('success');
        } else if (currentState == 'COMPLETED FAILURE' || currentState == 'COMPLETED CANCELLED') {
            this.setStatusIconState('error');
        } else {
            this.setStatusIconState('in_progress');
        }

        this.label.text = currentState;
        this.workflowUrl = workflowUrl;
        this.repositoryUrl = repositoryUrl;
        this.repositoryMenuItem.label.text = ownerAndRepo;
        this.infoItem.label.text = date + ' - ' + displayTitle + ' - (#' + runNumber + ')';
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

    setUserStarred(starred) {
        function toItem(e) {
            return {
                "iconName": 'starred-symbolic',
                "text": e['full_name'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        this.starredMenuItem.setHeaderItemText('Starred: ' + starred.length);
        this.starredMenuItem.submitItems(starred.map(e => toItem(e)));
    }

    setUserFollowers(followers) {
        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        this.followersMenuItem.setHeaderItemText('Followers: ' + followers.length);
        this.followersMenuItem.submitItems(followers.map(e => toItem(e)));
    }

    setUserFollowing(following) {
        function toItem(e) {
            return {
                "iconName": 'system-users-symbolic',
                "text": e['login'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        this.followingMenuItem.setHeaderItemText('Following: ' + following.length);
        this.followingMenuItem.submitItems(following.map(e => toItem(e)));
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

        this.stargazersMenuItem.setHeaderItemText('Stargazers: ' + stargazers.length);
        this.stargazersMenuItem.submitItems(stargazers.map(e => toItem(e)));
    }

    setWorkflows(workflows) {
        function toItem(e) {
            return {
                "iconName": 'mail-send-receive-symbolic',
                "text": e['name'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        this.workflowsMenuItem.setHeaderItemText('Workflows: ' + workflows.length);
        this.workflowsMenuItem.submitItems(workflows.map(e => toItem(e)));
    }

    setRuns(runs) {
        function toItem(e) {
            const conclusion = e['conclusion'];

            function conclusionIcon(conclusion) {
                if (conclusion == 'success') {
                    return 'emblem-default';
                } else if (conclusion == 'failure') {
                    return 'emblem-unreadable';
                } else {
                    return 'emblem-synchronizing';
                }
            }

            return {
                "iconName": conclusionIcon(conclusion),
                "text": e['display_title'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        this.runsMenuItem.setHeaderItemText('Workflow runs: ' + runs.length);
        this.runsMenuItem.submitItems(runs.map(e => toItem(e)));
    }

    setReleases(releases) {
        function toItem(e) {
            return {
                "iconName": 'folder-visiting-symbolic',
                "text": e['name'],
                "callback": () => utils.openUrl(e['html_url']),
            };
        }

        this.releasesMenuItem.setHeaderItemText('Releases: ' + releases.length);
        this.releasesMenuItem.submitItems(releases.map(e => toItem(e)));
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
                            utils.showNotification('The artifact: ' + filename + ' has been downloaded, check your home directory', true);
                        } else {
                            utils.showNotification('Something went wrong :/', false);
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

        this.artifactsMenuItem.setHeaderItemText('Artifacts: ' + artifacts.length);
        this.artifactsMenuItem.submitItems(artifacts.map(e => toItem(e)));
    }
};