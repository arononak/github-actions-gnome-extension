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
const { ExtensionController } = extension.imports.app.extension_controller;
const { QuickSettingsIndicator } = extension.imports.app.quick_settings_controller;

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);

        this.quickSettingsIndicator = null;
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');
        this.extensionController = new ExtensionController(this.settings);
        this.initExtension();

        this.quickSettingsIndicator = new QuickSettingsIndicator();
    }

    disable() {
        this.disposeExtension();
        this.extensionController = null;
        this.settings = null;

        this.quickSettingsIndicator.destroy();
        this.quickSettingsIndicator = null;
    }

    async initExtension() {
        try {
            const { enabledExtension } = await this.extensionController.fetchSettings();

            this.extensionController.attachCallbacks({
                onRepoSetAsWatched: (owner, repo) => {
                    NotificationController.showSetAsWatched(owner, repo);
                },
                onDeleteWorkflowRun: (success, runName) => {
                    NotificationController.showDeleteWorkflowRun(success, runName);
                },
                onCancelWorkflowRun: (success, runName) => {
                    NotificationController.showCancelWorkflowRun(success, runName);
                },
                onRerunWorkflowRun: (success, runName) => {
                    NotificationController.showRerunWorkflowRun(success, runName);
                },
                onBuildCompleted: (owner, repo, conclusion) => {
                    NotificationController.showCompletedBuild(owner, repo, conclusion);
                },
                onReloadCallback: () => {
                    this.disposeExtension();
                    this.initExtension();
                },
                onEnableCallback: async () => {
                    this.createStatusBarIndicator();
                },
                onDisableCallback: () => {
                    this.disposeExtension();
                },
            });

            if (enabledExtension) {
                this.createStatusBarIndicator();
            }
        } catch (error) {
            logError(error);
        }
    }

    disposeExtension() {
        this.extensionController.stopRefreshing();
        this.removeStatusBarIndicator();
    }

    async createStatusBarIndicator() {
        return new Promise(async (resolve, reject) => {
            try {
                const {
                    isInstalledCli,
                    isLogged,
                    tokenScopes,

                    simpleMode,
                    coloredMode,
                    uppercaseMode,
                    extendedColoredMode,
                    iconPosition,
                } = await this.extensionController.fetchSettings();
                
                this.indicator = new StatusBarIndicator({
                    isInstalledCli: isInstalledCli,
                    isLogged: isLogged,
                    tokenScopes: tokenScopes,
                    simpleMode: simpleMode,
                    coloredMode: coloredMode,
                    uppercaseMode: uppercaseMode,
                    extendedColoredMode: extendedColoredMode,
                    refreshCallback: () => {
                        this.extensionController.refresh();
                        this.indicator.refreshGithubIcon();

                        this.quickSettingsIndicator.destroy();
                        this.quickSettingsIndicator = null;
                        this.quickSettingsIndicator = new QuickSettingsIndicator();
                    },
                    downloadArtifactCallback: (downloadUrl, filename) => {
                        this.extensionController.downloadArtifact({
                            downloadUrl: downloadUrl,
                            filename: filename,
                            onFinishCallback: (success, filename) => {
                                NotificationController.showDownloadArtifact(success, filename);
                            },
                        });
                    },
                    logoutCallback: () => {
                        this.extensionController.logout();
                        this.indicator.setState({ state: StatusBarState.NOT_LOGGED });
                    },
                });

                Main.panel.addToStatusArea(this._uuid, this.indicator, iconPosition);

                this.extensionController.attachIndicator(this.indicator);
                this.extensionController.startRefreshing();

                resolve(true);
            } catch (error) {
                logError(error);
                resolve(false);
            }
        });
    }

    removeStatusBarIndicator() {
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
