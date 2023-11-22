/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

'use strict'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import { ExtensionController } from './lib/extension_controller.js'
import { StatusBarIndicator } from './lib/status_bar_indicator.js'
import { NotificationController } from './lib/notification_controller.js'
import { QuickSettingsIndicator } from './lib/quick_settings_controller.js'

export default class GithubActionsExtension extends Extension {
    enable() {
        this.settings = this.getSettings()
        this.extensionController = new ExtensionController(this.settings)
        this.createQuickSettings()
        this.initExtension()
    }

    disable() {
        this.disposeExtension()
        this.extensionController = null
        this.settings = null
        this.destroyQuickSettings()
    }

    createQuickSettings() {
        this.quickSettingsIndicator = new QuickSettingsIndicator()
    }

    destroyQuickSettings() {
        this.quickSettingsIndicator.destroy()
        this.quickSettingsIndicator = null
    }

    async initExtension() {
        try {
            const { enabledExtension } = await this.extensionController.fetchSettings()

            this.extensionController.attachCallbacks({
                onRepoSetAsWatched: (owner, repo) => {
                    NotificationController.showSetAsWatched(owner, repo)
                },
                onDeleteWorkflowRun: (success, runName) => {
                    NotificationController.showDeleteWorkflowRun(success, runName)
                },
                onCancelWorkflowRun: (success, runName) => {
                    NotificationController.showCancelWorkflowRun(success, runName)
                },
                onRerunWorkflowRun: (success, runName) => {
                    NotificationController.showRerunWorkflowRun(success, runName)
                },
                onBuildCompleted: (owner, repo, conclusion) => {
                    NotificationController.showCompletedBuild(owner, repo, conclusion)
                },
                onReloadCallback: () => {
                    this.extensionController.stopRefreshing()
                    this.disposeExtension()
                    this.initExtension()
                    this.extensionController.startRefreshing()
                },
                onEnableCallback: async () => {
                    this.destroyQuickSettings()
                    this.createQuickSettings()

                    await this.createStatusBarIndicator()
                    this.extensionController.startRefreshing()
                },
                onDisableCallback: () => {
                    this.destroyQuickSettings()
                    this.createQuickSettings()

                    this.extensionController.stopRefreshing()
                    this.disposeExtension()
                },
            })

            if (enabledExtension) {
                await this.createStatusBarIndicator()
                this.extensionController.startRefreshing()
            }
        } catch (error) {
            logError(error)
        }
    }

    disposeExtension() {
        this.removeStatusBarIndicator()
    }

    createStatusBarIndicator() {
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
                    showIcon,
                    textLengthLimiter,
                } = await this.extensionController.fetchSettings()

                this.indicator = new StatusBarIndicator({
                    isInstalledCli,
                    isLogged,
                    tokenScopes,
                    simpleMode,
                    coloredMode,
                    uppercaseMode,
                    extendedColoredMode,
                    showIcon,
                    textLengthLimiter,
                    refreshCallback: () => {
                        this.extensionController.refresh()

                        this.destroyQuickSettings()
                        this.createQuickSettings()
                    },
                    downloadArtifactCallback: (downloadUrl, filename) => {
                        this.extensionController.downloadArtifact({
                            indicator: this.indicator,
                            downloadUrl,
                            filename,
                            onFinishCallback: (_success, _filename) => {
                                NotificationController.showDownloadArtifact(_success, _filename)
                            },
                        })
                    },
                    copyTokenCallback: async () => {
                        await this.extensionController.copyTokenToClipboard()
                    },
                    logoutCallback: () => {
                        this.extensionController.logout()
                    },
                })

                Main.panel.addToStatusArea(this._uuid, this.indicator, iconPosition)

                this.extensionController.attachIndicator(this.indicator)

                resolve(true)
            } catch (error) {
                logError(error)
                resolve(false)
            }
        })
    }

    removeStatusBarIndicator() {
        if (this.indicator !== null && this.indicator !== undefined) {
            this.indicator.menu = null
            this.indicator.destroy()
            this.indicator = null
        }
    }
}
