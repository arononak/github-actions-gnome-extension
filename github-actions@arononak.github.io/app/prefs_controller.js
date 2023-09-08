'use strict'

const extension = imports.misc.extensionUtils.getCurrentExtension()
const { VERSION } = extension.imports.app.version
const { openUrl } = extension.imports.app.utils
const { SettingsRepository } = extension.imports.app.settings_repository

var PrefsController = class {
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

        const simpleMode = this.settingsRepository.fetchSimpleMode()
        const coloredMode = this.settingsRepository.fetchColoredMode()
        const uppercaseMode = this.settingsRepository.fetchUppercaseMode()
        const iconPosition = this.settingsRepository.fetchIconPosition()
        const showIcon = this.settingsRepository.fetchShowIcon()

        const hiddenMode = this.settingsRepository.fetchHiddenMode()

        return {
            "enabledExtension": enabledExtension,
            
            "owner": owner,
            "repo": repo,
            "refreshTime": refreshTime,
            "coldRefreshTime": coldRefreshTime,
            "packageSize": packageSize,
            "coldPackageSize": coldPackageSize,
            "pagination": pagination,

            "simpleMode": simpleMode,
            "coloredMode": coloredMode,
            "uppercaseMode": uppercaseMode,
            "iconPosition": iconPosition,
            "showIcon": showIcon,

            "hiddenMode": hiddenMode,

            "version": VERSION,
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
}
