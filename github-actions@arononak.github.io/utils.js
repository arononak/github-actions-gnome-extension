'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { GLib } = imports.gi;
const Util = imports.misc.util;

/// Package size
var prefsPackageSize = function(settings) {
    return bytesToString(settings.get_int('package-size-in-bytes'));
}

var prefsUpdatePackageSize = function(settings, sizeInBytes) {
    settings.set_int('package-size-in-bytes', sizeInBytes);
}

var prefsColdPackageSize = function(settings) {
    return bytesToString(settings.get_int('cold-package-size-in-bytes'));
}

var prefsUpdateColdPackageSize = function(settings, sizeInBytes) {
    settings.set_int('cold-package-size-in-bytes', sizeInBytes);
}

/// Refresh time
var prefsRefreshTime = function(settings) {
    return settings.get_int('refresh-time');
}

var prefsUpdateRefreshTime = function(settings, refreshTime) {
    settings.set_int('refresh-time', refreshTime);
}

var prefsRefreshFullUpdateTime = function(settings) {
    return settings.get_int('full-refresh-time');
}

var prefsUpdateFullRefreshTime = function(settings, refreshTime) {
    settings.set_int('full-refresh-time', refreshTime);
}

/// Data consumption
var prefsDataConsumptionPerHour = function(settings) {
    const packageSizeInBytes = settings.get_int('package-size-in-bytes');
    const refreshTime = prefsRefreshTime(settings);

    const _dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60 * 60);

    return bytesToString(_dataConsumptionPerHour) + '/h';
}

var prefsFullDataConsumptionPerHour = function(settings) {
    const packageSizeInBytes = settings.get_int('cold-package-size-in-bytes');
    const refreshTime = prefsRefreshFullUpdateTime(settings);

    const _dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60);

    return bytesToString(_dataConsumptionPerHour) + '/h';
}

function bytesToString(size) {
    var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));

    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i];
}

function isEmpty(str) {
    return (!str || str.length === 0);
}

function openUrl(url) {
    Util.spawnCommandLine('xdg-open ' + url);
}
