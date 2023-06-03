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

const { Clutter, GObject, St, Gio, GLib, Adw, Gtk, Soup, GdkPixbuf } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;

const GETTEXT_DOMAIN = 'github-actions-extension';
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;
const _ = ExtensionUtils.gettext;

const loadingText = "Loading";

function showFinishNotification(ownerAndRepo, success) {
    const source = new MessageTray.Source('Github Actions', success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic');
    Main.messageTray.add(source);

    const description = ownerAndRepo + (success === true ? ' - Succeeded' : ' - Failed :/');

    const notification = new MessageTray.Notification(source, 'Github Actions', description);
    source.showNotification(notification);
}

async function isLogged() {
    return new Promise((resolve, reject) => {
        try {
            let [, stdout, stderr, status] = GLib.spawn_command_line_sync('gh auth token');

            if (status !== 0) {
                if (stderr instanceof Uint8Array) {
                    stderr = ByteArray.toString(stderr); /// no auth token
                }

                resolve(false);
                return;
            }
            if (stdout instanceof Uint8Array) {
                stdout = ByteArray.toString(stdout);
            }

            resolve(true);
        } catch (e) {
            logError(e);
            resolve(false);
        }
    });
}

async function fetchUserActionsMinutes(username) {
    return new Promise((resolve, reject) => {
        try {
            let proc = Gio.Subprocess.new(
                ['gh', 'api', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', '/users/' + username + '/settings/billing/actions'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
                    const response = JSON.parse(stdout);
                    resolve(response);
                    return;
                } else {
                    throw new Error(stderr);
                }
            });
        } catch (e) {
            logError(e);
            resolve(null);
        }
    });
}

async function fetchUser() {
    const logged = await isLogged();

    return new Promise((resolve, reject) => {
        try {
            if (!logged) {
                resolve({ 'name': 'not logged', 'email': 'not logged' });
                return;
            }

            let proc = Gio.Subprocess.new(
                ['gh', 'api', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', '/user'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
                    const response = JSON.parse(stdout);
                    resolve(response);
                    return;
                } else {
                    throw new Error(stderr);
                }
            });
        } catch (e) {
            logError(e);
            resolve(null);
        }
    });
}

async function fetchWorkflowRun(owner, repo) {
    const logged = await isLogged();

    return new Promise((resolve, reject) => {
        try {
            if (!logged) {
                resolve({ 'conclusion': 'not logged' });
                return;
            }

            let proc = Gio.Subprocess.new(
                ['gh', 'api', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', '/repos/' + owner + '/' + repo + '/actions/runs'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
                    const response = JSON.parse(stdout);
                    const run = response["workflow_runs"][0];

                    const size = stdout.length;
                    run['_size_'] = size; /// Welcome in JS World :D

                    resolve(run);
                    return;
                } else {
                    throw new Error(stderr);
                }
            });
        } catch (e) {
            logError(e);
            resolve(null);
        }
    });
}

async function refresh(settings, indicator) {
    try {
        const owner = settings.get_string('owner');
        const repo = settings.get_string('repo');

        if (!utils.isEmpty(owner) && !utils.isEmpty(repo)) {
            const user = await fetchUser();

            const userLogin = user['login']
            const userEmail = user['email'];
            const userName = user['name'];

            const userActionsMinutes = await fetchUserActionsMinutes(userLogin);

            const parsedMinutes = 'Usage minutes: ' + userActionsMinutes['total_minutes_used'] + ' of ' + userActionsMinutes['included_minutes'] + '\t(' + userActionsMinutes['total_paid_minutes_used'] + ' paid}';

            const run = await fetchWorkflowRun(owner, repo);

            if (run == null) {
                indicator.clear();
            } else if (run['conclusion'] == 'not logged') {
                indicator.setNotLoggedState();
            } else {
                const status = run["status"].toString().toUpperCase();
                const conclusion = run["conclusion"] == null ? '' : run["conclusion"].toString().toUpperCase();
                const displayTitle = run["display_title"].toString();
                const runNumber = run["run_number"].toString();
                const updatedAt = run["updated_at"].toString();
                const ownerAndRepo = run["repository"]["full_name"].toString();

                const workflowUrl = run["html_url"].toString();
                const repositoryUrl = run["repository"]["html_url"].toString();

                const date = new Date(updatedAt);

                const sizeInBytes = run['_size_'];
                utils.prefsUpdatePackageSize(settings, sizeInBytes);


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
                indicator.userItem.label.text = userName + ' - ' + userEmail;
                indicator.minutesItem.label.text = parsedMinutes;
                indicator.ownerAndRepoItem.label.text = ownerAndRepo;
                indicator.infoItem.label.text = date.toUTCString() + "\n\n#" + runNumber + " " + displayTitle;
                indicator.packageSizeItem.label.text = utils.prefsDataConsumptionPerHour(settings);
            }
        }
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

            this.icon = new St.Icon({ style_class: 'system-status-icon' });
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github.svg`);
            this.label = new St.Label({ style_class: 'github-actions-label', text: loadingText, y_align: Clutter.ActorAlign.CENTER, y_expand: true });

            this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
            this.topBox.add_child(this.icon);
            this.topBox.add_child(this.label);
            this.add_child(this.topBox);

            /// Username + email
            this.userItem = new PopupMenu.PopupImageMenuItem(loadingText, 'avatar-default-symbolic');
            this.userItem.connect('activate', () => { });
            this.menu.addMenuItem(this.userItem);

            /// Actions minutes
            this.minutesItem = new PopupMenu.PopupImageMenuItem(loadingText, 'alarm-symbolic');
            this.minutesItem.connect('activate', () => { });
            this.menu.addMenuItem(this.minutesItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Owner and Repo
            this.ownerAndRepoItem = new PopupMenu.PopupImageMenuItem(loadingText, 'system-file-manager-symbolic');
            this.ownerAndRepoItem.connect('activate', () => utils.openUrl(this.repositoryUrl));
            this.menu.addMenuItem(this.ownerAndRepoItem);

            /// Info
            this.infoItem = new PopupMenu.PopupImageMenuItem(loadingText, 'object-flip-vertical-symbolic');
            this.infoItem.connect('activate', () => utils.openUrl(this.workflowUrl));
            this.menu.addMenuItem(this.infoItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Package Size
            this.packageSizeItem = new PopupMenu.PopupImageMenuItem(loadingText, 'network-wireless-symbolic');
            this.packageSizeItem.connect('activate', () => this.refreshCallback());
            this.menu.addMenuItem(this.packageSizeItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Refresh
            this.refreshItem = new PopupMenu.PopupImageMenuItem(_('Refresh'), 'view-refresh-symbolic');
            this.refreshItem.connect('activate', () => this.refreshCallback());
            this.menu.addMenuItem(this.refreshItem);

            /// Settings
            this.settingsItem = new PopupMenu.PopupImageMenuItem(_('Settings'), 'system-settings-symbolic');
            this.settingsItem.connect('activate', () => ExtensionUtils.openPrefs());
            this.menu.addMenuItem(this.settingsItem);
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
            this.ownerAndRepoLabel.text = '...';
            this.infoLabel.text = '...';
            this.packageSizeLabel.text = '...';
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
        this.indicator = new Indicator(() => refresh(this.settings, this.indicator));

        Main.panel.addToStatusArea(this._uuid, this.indicator);

        const refreshTime = this.settings.get_int('refresh-time') * 1000;
        refresh(this.settings, this.indicator);
        this.interval = setInterval(() => refresh(this.settings, this.indicator), refreshTime);
    }

    disable() {
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
        this.settings = null;

        clearInterval(this.interval);
        this.interval = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
