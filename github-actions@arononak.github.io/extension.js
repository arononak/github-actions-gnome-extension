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

'use strict';

const { GObject } = imports.gi;
const Main = imports.ui.main;

const GETTEXT_DOMAIN = 'github-actions-extension';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const extension = imports.misc.extensionUtils.getCurrentExtension();

const { StatusBarIndicator, StatusBarState } = extension.imports.app.status_bar_indicator;
const { NotificationController } = extension.imports.app.notification_controller;
const { ExtensionDataController } = extension.imports.app.extension_data_controller;

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');
        this.extensionDataController = new ExtensionDataController(this.settings);
        this.initIndicator(this.extensionDataController);
    }

    disable() {
        this.extensionDataController.stopRefreshing();
        this.disposeIndicator();

        this.extensionDataController = null;
        this.settings = null;
    }

    async initIndicator(extensionDataController) {
        try {
            const isInstalledCli = await extensionDataController.fetchIsInstalledCli();
            const isLogged = await extensionDataController.fetchIsLogged();

            const { simpleMode, coloredMode, uppercaseMode } = extensionDataController.fetchAppearanceSettings();

            this.indicator = new StatusBarIndicator({
                isInstalledCli: isInstalledCli,
                isLogged: isLogged,
                simpleMode: simpleMode,
                coloredMode: coloredMode,
                uppercaseMode: uppercaseMode,
                refreshCallback: () => {
                    extensionDataController.refresh();
                },
                downloadArtifactCallback: (downloadUrl, filename) => {
                    extensionDataController.downloadArtifact({
                        downloadUrl: downloadUrl,
                        filename: filename,
                        onFinishCallback: (success, filename) => NotificationController.showDownloadArtifact(success, filename),
                    });
                },
                logoutCallback: () => {
                    extensionDataController.logout(this.indicator);
                },
            });

            Main.panel.addToStatusArea(this._uuid, this.indicator);

            this.extensionDataController.startRefreshing({
                indicator: this.indicator,
                onRepoSetAsWatched: (owner, repo) => NotificationController.showSetAsWatched(owner, repo),
                onDeleteWorkflowRun: (success, runName) => NotificationController.showDeleteWorkflowRun(success, runName),
                onBuildCompleted: (owner, repo, conclusion) => NotificationController.showCompletedBuild(owner, repo, conclusion),
            });
        } catch (error) {
            logError(error);
        }
    }

    disposeIndicator() {
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
