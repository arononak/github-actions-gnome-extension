'use strict'

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

import { VERSION } from './version.js'
import { isEmpty, openUrl, openExtensionGithubIssuesPage } from './prefs_utils.js'
import { SettingsRepository } from './settings_repository.js'

export class PrefsController {
    constructor(settings) {
        this.settings = settings
        this.settingsRepository = new SettingsRepository(settings)
    }

    fetchData() {
        const enabledExtension = this.settingsRepository.fetchEnabledExtension()

        const owner = this.settingsRepository.fetchOwner()
        const repo = this.settingsRepository.fetchRepo()
        const refreshTime = this.settingsRepository.fetchRefreshTime()
        const coldRefreshTime = this.settingsRepository.fetchRefreshFullUpdateTime()
        const packageSize = this.settingsRepository.fetchPackageSize()
        const coldPackageSize = this.settingsRepository.fetchColdPackageSize()
        const pagination = this.settingsRepository.fetchPagination()

        const showNotifications = this.settingsRepository.fetchShowNotifications()
        const simpleMode = this.settingsRepository.fetchSimpleMode()
        const coloredMode = this.settingsRepository.fetchColoredMode()
        const uppercaseMode = this.settingsRepository.fetchUppercaseMode()
        const iconPosition = this.settingsRepository.fetchIconPosition()
        const showIcon = this.settingsRepository.fetchShowIcon()

        const hiddenMode = this.settingsRepository.fetchHiddenMode()

        const extensionVersion = VERSION
        const newestVersion = this.settingsRepository.fetchNewestVersion()

        var versionDescription = ''
        if (isEmpty(newestVersion)) {
            versionDescription = `${extensionVersion}`
        } else if (extensionVersion === newestVersion) {
            versionDescription = `No update available`
        } else {
            versionDescription = `New version ${newestVersion} is available`
        }

        return {
            "enabledExtension": enabledExtension,

            "owner": owner,
            "repo": repo,
            "refreshTime": refreshTime,
            "coldRefreshTime": coldRefreshTime,
            "packageSize": packageSize,
            "coldPackageSize": coldPackageSize,
            "pagination": pagination,

            "showNotifications": showNotifications,
            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
            "iconPosition": iconPosition,
            "showIcon": showIcon,

            "hiddenMode": hiddenMode,

            "version": extensionVersion,
            "versionDescription": versionDescription,
        }
    }

    updateOwner(owner) {
        this.settingsRepository.updateOwner(owner)
    }

    updateRepo(repo) {
        this.settingsRepository.updateRepo(repo)
    }

    onStarClicked() {
        openUrl('https://github.com/arononak/github-actions-gnome-extension')
    }

    onOpenExtensionFolderClicked() {
        const extension = ExtensionPreferences.lookupByUUID('github-actions@arononak.github.io')
        openUrl(`${extension.path}/assets`)
    }

    onOpenExtensionGithubIssuesPageClicked() {
        openExtensionGithubIssuesPage()
    }
}
