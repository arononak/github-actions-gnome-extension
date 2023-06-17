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
const dataRepository = Me.imports.data_repository;
const _ = ExtensionUtils.gettext;

const loadingText = "Loading";

function showFinishNotification(ownerAndRepo, success) {
    const source = new MessageTray.Source('Github Actions', success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic');
    Main.messageTray.add(source);

    const description = ownerAndRepo + (success === true ? ' - Succeeded' : ' - Failed :/');

    const notification = new MessageTray.Notification(source, 'Github Actions', description);
    source.showNotification(notification);
}

/// 1-60 minutes
async function coldRefresh(settings, indicator) {
    try {
        const owner = settings.get_string('owner');
        const repo = settings.get_string('repo');
        if (utils.isEmpty(owner) || utils.isEmpty(repo)) return;

        const user = await dataRepository.fetchUser();
        if (user == null) return;
        const login = user['login'];

        const starredList = await dataRepository.fetchUserStarred(login);
        const followers = await dataRepository.fetchUserFollowers();
        const following = await dataRepository.fetchUserFollowing();
        const workflows = await dataRepository.fetchWorkflows(owner, repo);
        const minutes = await dataRepository.fetchUserBillingActionsMinutes(login);
        const packages = await dataRepository.fetchUserBillingPackages(login);
        const sharedStorage = await dataRepository.fetchUserBillingSharedStorage(login);

        const sizeInBytes = user['_size_'] + starredList['_size_'] + followers['_size_'] + following['_size_'] + workflows['_size_'] + minutes['_size_'] + packages['_size_'] + sharedStorage['_size_'];
        utils.prefsUpdateColdPackageSize(settings, sizeInBytes);

        let userEmail;
        let userName;
        let createdAt;
        let userUrl;
        if (user != null) {
            userEmail = user['email'];
            userName = user['name'];
            createdAt = new Date(user['created_at']);
            userUrl = user['html_url'];
        }

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

        indicator.setUserStarred(starredList);
        indicator.setUserFollowers(followers);
        indicator.setUserFollowing(following);
        indicator.setWorkflows(workflows['workflows']);
        indicator.userUrl = userUrl;
        indicator.userItem.label.text = (userName == null || userEmail == null) ? 'Not logged' : userName + ' - ' + userEmail;
        indicator.joinedItem.label.text = 'Joined GitHub on: ' + createdAt.toLocaleFormat('%d %b %Y');
        indicator.minutesItem.label.text = parsedMinutes == null ? 'Not logged' : parsedMinutes;
        indicator.packagesItem.label.text = parsedPackages == null ? 'Not logged' : parsedPackages;
        indicator.sharedStorageItem.label.text = parsedSharedStorage == null ? 'Not logged' : parsedSharedStorage;
    } catch (error) {
        logError(error);
    }
}

/// 5-60sec
async function hotRefresh(settings, indicator) {
    try {
        const owner = settings.get_string('owner');
        const repo = settings.get_string('repo');
        if (utils.isEmpty(owner) || utils.isEmpty(repo)) return;

        const runs = await dataRepository.fetchWorkflowRuns(owner, repo);
        if (runs == null) {
            indicator.setNotLoggedState();
            return;
        }

        utils.prefsUpdatePackageSize(settings, runs['_size_']);

        const latestRun = runs['workflow_runs'][0];
        const status = latestRun["status"].toString().toUpperCase();
        const conclusion = latestRun["conclusion"] == null ? '' : latestRun["conclusion"].toString().toUpperCase();
        const displayTitle = latestRun["display_title"].toString();
        const runNumber = latestRun["run_number"].toString();
        const updatedAt = latestRun["updated_at"].toString();
        const ownerAndRepo = latestRun["repository"]["full_name"].toString();
        const workflowUrl = latestRun["html_url"].toString();
        const repositoryUrl = latestRun["repository"]["html_url"].toString();
        const date = new Date(updatedAt);
        const previousState = indicator.label.text;
        const currentState = status + ' ' + conclusion;

        /// Notification
        if (!utils.isEmpty(previousState) && previousState !== loadingText && previousState !== currentState) {
            if (currentState === 'COMPLETED SUCCESS') {
                showFinishNotification(ownerAndRepo, true);
            } else if (currentState === 'COMPLETED FAILURE') {
                showFinishNotification(ownerAndRepo, false);
            }
        }

        indicator.label.text = currentState;
        indicator.workflowUrl = workflowUrl;
        indicator.repositoryUrl = repositoryUrl;
        indicator.ownerAndRepoItem.label.text = ownerAndRepo;
        indicator.infoItem.label.text = date.toUTCString() + "\n\n#" + runNumber + " " + displayTitle;
        indicator.packageSizeItem.label.text = 'Status refresh: ' + utils.prefsDataConsumptionPerHour(settings);
        indicator.fullPackageSizeItem.label.text = 'Full refresh: ' + utils.prefsFullDataConsumptionPerHour(settings);
        indicator.setRuns(runs['workflow_runs']);
    } catch (error) {
        logError(error);
    }
}

/// Button
const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        constructor(refreshCallback) {
            super();
            this.refreshCallback = refreshCallback;

            this.workflowUrl = "";
            this.repositoryUrl = "";
            this.userUrl = "";

            this.icon = new St.Icon({ style_class: 'system-status-icon' });
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github.svg`);
            this.label = new St.Label({ style_class: 'github-actions-label', text: loadingText, y_align: Clutter.ActorAlign.CENTER, y_expand: true });
            this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
            this.topBox.add_child(this.icon);
            this.topBox.add_child(this.label);
            this.add_child(this.topBox);

            /// Username + email
            this.userItem = new PopupMenu.PopupImageMenuItem(loadingText, 'avatar-default-symbolic');
            this.userItem.connect('activate', () => utils.openUrl(this.userUrl));
            this.menu.addMenuItem(this.userItem);

            /// Created at
            this.joinedItem = new PopupMenu.PopupImageMenuItem(loadingText, 'mail-forward-symbolic');
            this.joinedItem.connect('activate', () => { });
            this.menu.addMenuItem(this.joinedItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Starred
            this.starredScrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.starredMenuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.starredScrollView.add_actor(this.starredMenuBox);
            this.starredMenuItem = new PopupMenu.PopupSubMenuMenuItem(loadingText);
            this.starredMenuItem.menu.box.add_actor(this.starredScrollView);
            this.menu.addMenuItem(this.starredMenuItem);

            /// Followers
            this.followersScrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.followersMenuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.followersScrollView.add_actor(this.followersMenuBox);
            this.followersMenuItem = new PopupMenu.PopupSubMenuMenuItem(loadingText);
            this.followersMenuItem.menu.box.add_actor(this.followersScrollView);
            this.menu.addMenuItem(this.followersMenuItem);

            /// Following
            this.followingScrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.followingMenuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.followingScrollView.add_actor(this.followingMenuBox);
            this.followingMenuItem = new PopupMenu.PopupSubMenuMenuItem(loadingText);
            this.followingMenuItem.menu.box.add_actor(this.followingScrollView);
            this.menu.addMenuItem(this.followingMenuItem);

            /// Billing
            this.billingScrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.billingMenuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.billingScrollView.add_actor(this.billingMenuBox);
            this.billingMenuItem = new PopupMenu.PopupSubMenuMenuItem('Billing');
            this.billingMenuItem.menu.box.add_actor(this.billingScrollView);
            this.menu.addMenuItem(this.billingMenuItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Billing Actions minutes
            this.minutesItem = new PopupMenu.PopupImageMenuItem(loadingText, 'alarm-symbolic');
            this.minutesItem.connect('activate', () => { });
            this.billingMenuBox.add_actor(this.minutesItem);

            /// Billing Packages
            this.packagesItem = new PopupMenu.PopupImageMenuItem(loadingText, 'network-transmit-receive-symbolic');
            this.packagesItem.connect('activate', () => { });
            this.billingMenuBox.add_actor(this.packagesItem);

            /// Billing Shared Storage
            this.sharedStorageItem = new PopupMenu.PopupImageMenuItem(loadingText, 'network-server-symbolic');
            this.sharedStorageItem.connect('activate', () => { });
            this.billingMenuBox.add_actor(this.sharedStorageItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Owner and Repo
            this.ownerAndRepoItem = new PopupMenu.PopupImageMenuItem(loadingText, 'system-file-manager-symbolic');
            this.ownerAndRepoItem.connect('activate', () => utils.openUrl(this.repositoryUrl));
            this.menu.addMenuItem(this.ownerAndRepoItem);

            /// Info
            this.infoItem = new PopupMenu.PopupImageMenuItem(loadingText, 'object-flip-vertical-symbolic');
            this.infoItem.connect('activate', () => utils.openUrl(this.workflowUrl));
            this.menu.addMenuItem(this.infoItem);

            /// Workflows
            this.workflowsScrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.workflowsMenuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.workflowsScrollView.add_actor(this.workflowsMenuBox);
            this.workflowsMenuItem = new PopupMenu.PopupSubMenuMenuItem(loadingText);
            this.workflowsMenuItem.menu.box.add_actor(this.workflowsScrollView);
            this.menu.addMenuItem(this.workflowsMenuItem);

            /// Runs
            this.runsScrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
            this.runsMenuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
            this.runsScrollView.add_actor(this.runsMenuBox);
            this.runsMenuItem = new PopupMenu.PopupSubMenuMenuItem(loadingText);
            this.runsMenuItem.menu.box.add_actor(this.runsScrollView);
            this.menu.addMenuItem(this.runsMenuItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Package Size
            this.packageSizeItem = new PopupMenu.PopupImageMenuItem(loadingText, 'network-wireless-symbolic');
            this.menu.addMenuItem(this.packageSizeItem);
            this.fullPackageSizeItem = new PopupMenu.PopupImageMenuItem(loadingText, 'network-wireless-symbolic');
            this.menu.addMenuItem(this.fullPackageSizeItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            this.bottomButtonBox = new St.BoxLayout({
                style_class: 'github-actions-button-box',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                clip_to_allocation: true,
                reactive: true,
                x_expand: true,
                pack_start: false,
                vertical: false
            });
            this.bottomItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
            this.bottomItem.actor.add_actor(this.bottomButtonBox);
            this.menu.addMenuItem(this.bottomItem);

            /// Refresh
            this.refreshButton = this.createRoundButton('view-refresh-symbolic');
            this.refreshButton.connect('clicked', (self) => this.refreshCallback());
            this.bottomButtonBox.add_actor(this.refreshButton);

            /// Bored
            this.boredButton = this.createRoundButton('face-monkey-symbolic');
            this.boredButton.connect('clicked', (self) => utils.openUrl('https://api.github.com/octocat'));
            this.bottomButtonBox.add_actor(this.boredButton);

            /// Settings
            this.settingsItem = this.createRoundButton('system-settings-symbolic');
            this.settingsItem.connect('clicked', (self) => ExtensionUtils.openPrefs());
            this.bottomButtonBox.add_actor(this.settingsItem);
        }

        createRoundButton(iconName) {
            const button = new St.Button({ style_class: 'button github-actions-button-action' });
            button.child = new St.Icon({ icon_name: iconName });
            return button;
        }

        setWorkflows(workflows) {
            this.workflowsMenuBox.remove_all_children();
            this.workflowsMenuItem.label.text = 'Workflows: ' + workflows.length;

            workflows.forEach((element) => {
                const item = new PopupMenu.PopupImageMenuItem(element['name'], 'view-wrapped-symbolic');
                item.connect('activate', () => utils.openUrl(element['html_url']));
                this.workflowsMenuBox.add_actor(item);
            });
        }

        setRuns(runs) {
            this.runsMenuBox.remove_all_children();
            this.runsMenuItem.label.text = 'Runs: ' + runs.length;

            runs.forEach((element) => {
                const iconName = element['conclusion'] == 'success' ? 'emblem-default' : 'emblem-unreadable';
                const item = new PopupMenu.PopupImageMenuItem(element['display_title'], iconName);
                item.connect('activate', () => utils.openUrl(element['html_url']));
                this.runsMenuBox.add_actor(item);
            });
        }

        setUserStarred(starred) {
            this.starredMenuBox.remove_all_children();
            this.starredMenuItem.label.text = 'Starred: ' + starred.length;

            starred.forEach((element) => {
                const item = new PopupMenu.PopupImageMenuItem(element['full_name'], 'starred-symbolic');
                item.connect('activate', () => utils.openUrl(element['html_url']));
                this.starredMenuBox.add_actor(item);
            });
        }

        setUserFollowers(followers) {
            this.followersMenuBox.remove_all_children();
            this.followersMenuItem.label.text = 'Followers: ' + followers.length;

            followers.forEach((element) => {
                const item = new PopupMenu.PopupImageMenuItem(element['login'], 'system-users-symbolic');
                item.connect('activate', () => utils.openUrl(element['html_url']));
                this.followersMenuBox.add_actor(item);
            });
        }

        setUserFollowing(following) {
            this.followingMenuBox.remove_all_children();
            this.followingMenuItem.label.text = 'Following: ' + following.length;

            following.forEach((element) => {
                const item = new PopupMenu.PopupImageMenuItem(element['login'], 'system-users-symbolic');
                item.connect('activate', () => utils.openUrl(element['html_url']));
                this.followingMenuBox.add_actor(item);
            });
        }

        clear() {
            this.label.text = null;
            this.workflowUrl = null;
            this.repositoryUrl = null;
        }

        setNotLoggedState() {
            this.label.text = "Not logged in";
            this.workflowUrl = null;
            this.repositoryUrl = null;

            this.userItem.label.text = '...';
            this.minutesItem.label.text = '...';

            this.ownerAndRepoItem.label.text = '...';
            this.infoItem.label.text = '...';
            this.packageSizeItem.label.text = '...';
            this.fullPackageSizeItem.label.text = '...';
        }

        _init() {
            super._init(0.0, 'Github Action button', false);
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

    startRefreshing() {
        this.refresh();

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

    refresh() {
        coldRefresh(this.settings, this.indicator);
        hotRefresh(this.settings, this.indicator);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
