/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ExtensionUtils = imports.misc.extensionUtils;

const GETTEXT_DOMAIN = 'github-actions-extension';
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;
const repository = Me.imports.data_repository;
const _ = ExtensionUtils.gettext;

const loadingText = 'Loading';
const notLoggedInText = 'Not logged in';

function showNotification(message, success) {
    const source = new MessageTray.Source('Github Actions', success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic');
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification(source, 'Github Actions', message);
    source.showNotification(notification);

    const file = Gio.File.new_for_path(
        success === true
            ? '/usr/share/sounds/freedesktop/stereo/complete.oga'
            : '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga'
    );

    const player = global.display.get_sound_player();
    player.play_from_file(file, '', null);
}

function showFinishNotification(ownerAndRepo, success) {
    const description = ownerAndRepo + (success === true ? ' - Succeeded' : ' - Failed :/');
    showNotification(description, success);
}

/// 1-60 minutes
async function coldRefresh(settings, indicator) {
    try {
        if (indicator.isLogged == false) return;

        const owner = settings.get_string('owner');
        const repo = settings.get_string('repo');
        if (utils.isEmpty(owner) || utils.isEmpty(repo)) return;

        const user = await repository.fetchUser();
        if (user == null) return;
        const login = user['login'];

        const pagination = utils.prefsPagination(settings);

        const minutes = await repository.fetchUserBillingActionsMinutes(login);
        const packages = await repository.fetchUserBillingPackages(login);
        const sharedStorage = await repository.fetchUserBillingSharedStorage(login);
        const starredList = await repository.fetchUserStarred(login, pagination);
        const followers = await repository.fetchUserFollowers(pagination);
        const following = await repository.fetchUserFollowing(pagination);
        const workflows = await repository.fetchWorkflows(owner, repo, pagination);
        const artifacts = await repository.fetchArtifacts(owner, repo, pagination);
        const stargazers = await repository.fetchStargazers(owner, repo, pagination);
        const runs = await repository.fetchWorkflowRuns(owner, repo, pagination);
        const releases = await repository.fetchReleases(owner, repo, pagination);

        const allDataObjects = [
            user,

            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases
        ];

        const sizeInBytes = allDataObjects.filter(e => e != null).reduce((sum, object) => sum + object._size_, 0);

        utils.prefsUpdateColdPackageSize(settings, sizeInBytes);

        indicator.setUser(user);
        indicator.setUserBilling(minutes, packages, sharedStorage);
        indicator.setUserStarred(starredList);
        indicator.setUserFollowers(followers);
        indicator.setUserFollowing(following);
        indicator.setWorkflows(workflows['workflows']);
        indicator.setArtifacts(artifacts['artifacts']);
        indicator.setStargazers(stargazers);
        indicator.setRuns(runs['workflow_runs']);
        indicator.setReleases(releases);
    } catch (error) {
        logError(error);
    }
}

/// 1-60sec
async function hotRefresh(settings, indicator) {
    try {
        if (indicator.isLogged == false) return;

        const owner = settings.get_string('owner');
        const repo = settings.get_string('repo');
        if (utils.isEmpty(owner) || utils.isEmpty(repo)) return;

        const run = await repository.fetchWorkflowRuns(owner, repo, 1);
        if (run == null) return;

        utils.prefsUpdatePackageSize(settings, run['_size_']);

        const previousState = indicator.label.text;
        indicator.setLatestRun(run['workflow_runs'][0]);
        const currentState = indicator.label.text;

        indicator.refreshTransfer(settings, indicator.isLogged);
        indicator.refreshBoredIcon();

        /// Notification
        if (!utils.isEmpty(previousState) && previousState !== loadingText && previousState !== notLoggedInText && previousState !== currentState) {
            const ownerAndRepo = indicator.repositoryMenuItem.label.text;

            if (currentState === 'COMPLETED SUCCESS') {
                showFinishNotification(ownerAndRepo, true);
            } else if (currentState === 'COMPLETED FAILURE') {
                showFinishNotification(ownerAndRepo, false);
            }
        }
    } catch (error) {
        logError(error);
    }
}

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

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
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
            this.label = new St.Label({ style_class: 'github-actions-label', text: loadingText, y_align: Clutter.ActorAlign.CENTER, y_expand: true });

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
            this.userMenuItem = new ExpandedMenuItem(null, loadingText);
            this.menu.addMenuItem(this.userMenuItem);

            /// 2 FA
            this.twoFactorCallback = () => this.twoFactorEnabled == false ? utils.openUrl('https://github.com/settings/two_factor_authentication/setup/intro') : {};
            this.twoFactorItem = createPopupImageMenuItem(loadingText, 'security-medium-symbolic', this.twoFactorCallback);
            this.userMenuItem.menuBox.add_actor(this.twoFactorItem);

            /// Minutes
            this.minutesItem = createPopupImageMenuItem(loadingText, 'alarm-symbolic', () => { });
            this.userMenuItem.menuBox.add_actor(this.minutesItem);

            /// Packages
            this.packagesItem = createPopupImageMenuItem(loadingText, 'network-transmit-receive-symbolic', () => { });
            this.userMenuItem.menuBox.add_actor(this.packagesItem);

            /// Shared Storage
            this.sharedStorageItem = createPopupImageMenuItem(loadingText, 'network-server-symbolic', () => { });
            this.userMenuItem.menuBox.add_actor(this.sharedStorageItem);

            /// Starred
            this.starredMenuItem = new ExpandedMenuItem('starred-symbolic', loadingText);
            this.menu.addMenuItem(this.starredMenuItem);

            /// Followers            
            this.followersMenuItem = new ExpandedMenuItem('system-users-symbolic', loadingText);
            this.menu.addMenuItem(this.followersMenuItem);

            /// Following
            this.followingMenuItem = new ExpandedMenuItem('system-users-symbolic', loadingText);
            this.menu.addMenuItem(this.followingMenuItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Repository
            this.repositoryMenuItem = new ExpandedMenuItem('system-file-manager-symbolic', loadingText);
            this.menu.addMenuItem(this.repositoryMenuItem);

            /// Repository Open
            this.openRepositoryItem = createPopupImageMenuItem('Open', 'applications-internet-symbolic', () => utils.openUrl(this.repositoryUrl));
            this.repositoryMenuItem.menuBox.add_actor(this.openRepositoryItem);

            /// Repository Last commit
            this.infoItem = createPopupImageMenuItem(loadingText, 'object-flip-vertical-symbolic', () => utils.openUrl(this.workflowUrl));
            this.repositoryMenuItem.menuBox.add_actor(this.infoItem);

            /// Stargazers
            this.stargazersMenuItem = new ExpandedMenuItem('starred-symbolic', loadingText);
            this.menu.addMenuItem(this.stargazersMenuItem);

            /// Workflows
            this.workflowsMenuItem = new ExpandedMenuItem('mail-send-receive-symbolic', loadingText);
            this.menu.addMenuItem(this.workflowsMenuItem);

            /// Runs
            this.runsMenuItem = new ExpandedMenuItem('media-playback-start-symbolic', loadingText);
            this.menu.addMenuItem(this.runsMenuItem);

            /// Artifacts
            this.artifactsMenuItem = new ExpandedMenuItem('insert-object-symbolic', loadingText);
            this.menu.addMenuItem(this.artifactsMenuItem);

            /// Releases
            this.releasesMenuItem = new ExpandedMenuItem('folder-download-symbolic', loadingText);
            this.menu.addMenuItem(this.releasesMenuItem);
        }

        refreshTransfer(settings, isLogged) {
            if (isLogged == true) {
                this.networkLabel.text = utils.fullDataConsumptionPerHour(settings);
            }
        }

        refreshAuthState(isLogged) {
            if (this.isLogged == false) {
                this.label.text = notLoggedInText;
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
                        if (success === true) {
                            showNotification('The artifact: ' + filename + ' has been downloaded, check your home directory', true);
                        } else {
                            showNotification('Something went wrong :/', false);
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
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');

        this.settings.connect('changed::refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing();
        });

        this.settings.connect('changed::full-refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing();
        });

        this.indicator = new Indicator(() => this.refresh());
        Main.panel.addToStatusArea(this._uuid, this.indicator);
        this.startRefreshing();
    }

    disable() {
        this.stopRefreshing();
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
        this.settings = null;
    }

    async startRefreshing() {
        await this.refresh();

        const statusRefreshTimeInSeconds = this.settings.get_int('refresh-time');
        const fullStatusRefreshTimeInMinutes = this.settings.get_int('full-refresh-time');

        this.hotRefreshInterval = setInterval(() => hotRefresh(this.settings, this.indicator), statusRefreshTimeInSeconds * 1000);
        this.coldRefreshInterval = setInterval(() => coldRefresh(this.settings, this.indicator), fullStatusRefreshTimeInMinutes * 60 * 1000);
    }

    stopRefreshing() {
        clearInterval(this.hotRefreshInterval);
        this.hotRefreshInterval = null;

        clearInterval(this.coldRefreshInterval);
        this.coldRefreshInterval = null;
    }

    async refresh() {
        const isLogged = await repository.isLogged();
        this.indicator.refreshAuthState(isLogged);

        coldRefresh(this.settings, this.indicator);
        hotRefresh(this.settings, this.indicator);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
