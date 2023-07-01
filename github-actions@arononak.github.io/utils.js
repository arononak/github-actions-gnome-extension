'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { GLib, Gio } = imports.gi;
const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;

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
    imports.misc.util.trySpawnCommandLine('xdg-open ' + url);
}

function openUrlPrefs(url) {
    try {
        GLib.spawn_command_line_async('xdg-open ' + url);
    } catch (e) {
        logError(e);
    }
}

function isDarkTheme() {
    const [res, out] = GLib.spawn_command_line_sync("gsettings get org.gnome.desktop.interface gtk-theme");

    return out.toString().replace(/'/g, "").trim().includes("dark");
}

function showNotification(message, success) {
    const source = new MessageTray.Source('Github Actions', success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic');
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification(source, 'Github Actions', message);
    source.showNotification(notification);

    const file = Gio.File.new_for_path(
        success === true
            ? '/usr/share/sounds/freedesktop/stereo/complete.oga'
            : '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga'
    );

    const player = global.display.get_sound_player();
    player.play_from_file(file, '', null);
}
