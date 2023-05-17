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

const { Clutter, GObject, St, Gio, GLib, Adw, Gtk } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;

const GETTEXT_DOMAIN = 'github-actions-extension';
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

function isEmpty(str) {
    return (!str || str.length === 0);
}

function openUrl(url) {
    try {
        GLib.spawn_command_line_async('xdg-open ' + url);
    } catch (e) {
        logError(e);
    }
}

async function isLogged() {
    return new Promise((resolve, reject) => {
        try {
            let [, stdout, stderr, status] = GLib.spawn_command_line_sync('gh auth token');

            if (status !== 0) {
                if (stderr instanceof Uint8Array) {
                    stderr = ByteArray.toString(stderr);
                }

                logError(stderr);
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

async function fetchStatus(owner, repo) {
    const logged = await isLogged();
    if (!logged) {
        return null;
    }

    return new Promise((resolve, reject) => {
        try {
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

        if (!isEmpty(owner) && !isEmpty(repo)) {
            let run = await fetchStatus(owner, repo);
            if (run != null) {
                const status = run["status"].toString().toUpperCase();
                const displayTitle = run["display_title"].toString();
                const runNumber = run["run_number"].toString();
                const updatedAt = run["updated_at"].toString();
                const ownerAndRepo = run["repository"]["full_name"].toString();

                const workflowUrl = run["html_url"].toString();
                const repositoryUrl = run["repository"]["html_url"].toString();

                const date = new Date(updatedAt);

                const sizeInBytes = run['_size_'];
                settings.set_int('package-size-in-bytes', sizeInBytes);
                const refreshTime = settings.get_int('refresh-time');

                indicator.label.text = status;
                indicator.workflowUrl = workflowUrl;
                indicator.repositoryUrl = repositoryUrl;
                indicator.ownerAndRepoLabel.text = ownerAndRepo;
                indicator.infoLabel.text = date.toUTCString() + "\n\n#" + runNumber + " " + displayTitle;
                indicator.packageSizeLabel.text = parseInt(sizeInBytes / 1024, 10) + " KB / " + refreshTime + "s"
            }
        }
    } catch (error) {
        logError(error);
    }
}

/// Button
const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        constructor(ownerAndRepoLabel, infoLabel, packageSizeLabel) {
            super();
            this.ownerAndRepoLabel = ownerAndRepoLabel;
            this.infoLabel = infoLabel;
            this.packageSizeLabel = packageSizeLabel;

            this.workflowUrl = "";
            this.repositoryUrl = "";

            this.icon = new St.Icon({ style_class: 'system-status-icon' });
            this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/github.svg`);
            this.label = new St.Label({ style_class: 'github-actions-label', text: 'Loading', y_align: Clutter.ActorAlign.CENTER, y_expand: true });

            this.topBox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
            this.topBox.add_child(this.icon);
            this.topBox.add_child(this.label);
            this.add_child(this.topBox);

            /// Owner and Repo
            this.ownerAndRepoItem = new PopupMenu.PopupBaseMenuItem({ reactive: true });
            this.ownerAndRepoItem.actor.add_actor(this.ownerAndRepoLabel);
            this.ownerAndRepoItem.connect('activate', () => openUrl(this.repositoryUrl));
            this.menu.addMenuItem(this.ownerAndRepoItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Info
            this.infoLabelItem = new PopupMenu.PopupBaseMenuItem({ reactive: true });
            this.infoLabelItem.actor.add_actor(this.infoLabel);
            this.infoLabelItem.connect('activate', () => openUrl(this.workflowUrl));
            this.menu.addMenuItem(this.infoLabelItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Download package size
            this.packageSizeItem = new PopupMenu.PopupBaseMenuItem({ reactive: true });
            this.packageSizeItem.actor.add_actor(this.packageSizeLabel);
            this.menu.addMenuItem(this.packageSizeItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /// Settings
            this.settingsItem = new PopupMenu.PopupImageMenuItem(_('Settings'), 'system-settings-symbolic');
            this.settingsItem.connect('activate', () => ExtensionUtils.openPrefs());
            this.menu.addMenuItem(this.settingsItem);
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

        this.ownerAndRepoLabel = new St.Label({ text: 'Loading' });
        this.infoLabel = new St.Label({ text: 'Loading' });
        this.packageSizeLabel = new St.Label({ text: 'Loading' });
        this.indicator = new Indicator(this.ownerAndRepoLabel, this.infoLabel, this.packageSizeLabel);

        Main.panel.addToStatusArea(this._uuid, this.indicator);

        const refreshTime = this.settings.get_int('refresh-time') * 1000;
        refresh(this.settings, this.indicator);
        this.interval = setInterval(() => refresh(this.settings, this.indicator), refreshTime);
    }

    disable() {
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
        this.ownerAndRepoLabel = null;
        this.infoLabel = null;
        this.packageSizeLabel = null;
        this.settings = null;

        clearInterval(this.interval);
        this.interval = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
