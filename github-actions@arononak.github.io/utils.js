'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { GLib } = imports.gi;

var prefsPackageSize = (settings) => bytesToString(settings.get_int('package-size-in-bytes'));
var prefsUpdatePackageSize = (settings, sizeInBytes) => settings.set_int('package-size-in-bytes', sizeInBytes);

var prefsColdPackageSize = (settings) => bytesToString(settings.get_int('cold-package-size-in-bytes'));
var prefsUpdateColdPackageSize = (settings, sizeInBytes) => settings.set_int('cold-package-size-in-bytes', sizeInBytes);

var prefsRefreshTime = (settings) => settings.get_int('refresh-time');
var prefsUpdateRefreshTime = (settings, refreshTime) => settings.set_int('refresh-time', refreshTime);

var prefsRefreshFullUpdateTime = (settings) => settings.get_int('full-refresh-time');
var prefsUpdateFullRefreshTime = (settings, refreshTime) => settings.set_int('full-refresh-time', refreshTime);

var prefsPagination = (settings) => settings.get_int('pagination');
var prefsUpdatePagination = (settings, pagination) => settings.set_int('pagination', pagination);

var prefsDataConsumptionPerHour = function (settings) {
    const packageSizeInBytes = settings.get_int('package-size-in-bytes');
    const refreshTime = prefsRefreshTime(settings);
    const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60 * 60);

    return bytesToString(dataConsumptionPerHour) + '/h';
}

var prefsFullDataConsumptionPerHour = function (settings) {
    const packageSizeInBytes = settings.get_int('cold-package-size-in-bytes');
    const refreshTime = prefsRefreshFullUpdateTime(settings);
    const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60);

    return bytesToString(dataConsumptionPerHour) + '/h';
}

var fullDataConsumptionPerHour = function (settings) {
    const hotRefreshSize = settings.get_int('package-size-in-bytes');
    const hotRefreshTime = prefsRefreshTime(settings);
    const hotConsumption = ((hotRefreshSize / hotRefreshTime) * 60 * 60);

    const coldRefreshSize = settings.get_int('cold-package-size-in-bytes');
    const coldRefreshTime = prefsRefreshFullUpdateTime(settings);
    const coldConsumption = ((coldRefreshSize / coldRefreshTime) * 60);

    return bytesToString(hotConsumption + coldConsumption) + '/h';
}

function bytesToString(size) {
    var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i];
}

function isEmpty(str) {
    return (!str || str.length === 0);
}

function openUrl(url) {
    const Util = imports.misc.util;
    Util.spawnCommandLine('xdg-open ' + url);
}
