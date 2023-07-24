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
const { DataController } = extension.imports.app.data_controller;
const {
    showDownloadArtifactNotification,
    showSetAsWatchedNotification,
    showDeleteWorkflowRunNotification,
    showCompletedBuildNotification,
} = extension.imports.app.notification_controller;

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');
        this.dataController = new DataController(this.settings);
        this.initIndicator(this.dataController);
    }

    disable() {
        this.dataController.stopRefreshing();
        this.disposeIndicator();
        this.settings = null;
    }

    async initIndicator(dataController) {
        try {
            const isInstalledCli = await dataController.fetchIsInstalledCli();
            const isLogged = await dataController.fetchIsLogged();

            const { simpleMode, coloredMode, uppercaseMode } = dataController.fetchAppearanceSettings();

            this.indicator = new StatusBarIndicator({
                isInstalledCli: isInstalledCli,
                isLogged: isLogged,
                simpleMode: simpleMode,
                coloredMode: coloredMode,
                uppercaseMode: uppercaseMode,
                refreshCallback: () => {
                    dataController.refresh();
                },
                downloadArtifactCallback: (downloadUrl, filename) => {
                    dataController.downloadArtifact({
                        downloadUrl: downloadUrl,
                        filename: filename,
                        onFinishCallback: (success, filename) => showDownloadArtifactNotification(success, filename),
                    });
                },
                logoutCallback: () => {
                    dataController.logout(this.indicator);
                },
            });

            Main.panel.addToStatusArea(this._uuid, this.indicator);

            this.dataController.startRefreshing({
                indicator: this.indicator,
                onRepoSetAsWatched: (owner, repo) => showSetAsWatchedNotification(owner, repo),
                onDeleteWorkflowRun: (success, runName) => showDeleteWorkflowRunNotification(success, runName),
                onBuildCompleted: (owner, repo, conclusion) => showCompletedBuildNotification(owner, repo, conclusion),
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
