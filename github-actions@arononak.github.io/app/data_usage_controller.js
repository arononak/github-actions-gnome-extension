'use strict';

const extension = imports.misc.extensionUtils.getCurrentExtension();
const { SettingsRepository } = extension.imports.app.settings_repository;
const { bytesToString } = extension.imports.app.utils;

var DataUsageController = class {
    constructor(settings) {
        this.settings = settings;
        this.settingsRepository = new SettingsRepository(settings);
    }

    dataConsumptionPerHour() {
        const packageSizeInBytes = this.settings.get_int('package-size-in-bytes');
        const refreshTime = this.settingsRepository.fetchRefreshTime();
        const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60 * 60);

        return `${bytesToString(dataConsumptionPerHour)}/h`;
    }

    fullDataConsumptionPerHour() {
        const packageSizeInBytes = this.settings.get_int('cold-package-size-in-bytes');
        const refreshTime = this.settingsRepository.fetchRefreshFullUpdateTime();
        const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60);

        return `${bytesToString(dataConsumptionPerHour)}/h`;
    }

    fullDataConsumptionPerHour() {
        const hotRefreshSize = this.settings.get_int('package-size-in-bytes');
        const hotRefreshTime = this.settingsRepository.fetchRefreshTime();
        const hotConsumption = ((hotRefreshSize / hotRefreshTime) * 60 * 60);

        const coldRefreshSize = this.settings.get_int('cold-package-size-in-bytes');
        const coldRefreshTime = this.settingsRepository.fetchRefreshFullUpdateTime();
        const coldConsumption = ((coldRefreshSize / coldRefreshTime) * 60);

        return `${bytesToString(hotConsumption + coldConsumption)}/h`;
    }

    updateTransfer(jsonObjects) {
        const sizeInBytes = jsonObjects
            .filter(e => e != null)
            .reduce((sum, object) => sum + object._size_, 0);

        this.settingsRepository.updateColdPackageSize(sizeInBytes);
    }
}
