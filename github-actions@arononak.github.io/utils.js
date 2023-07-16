'use strict';

const { GLib, Gio } = imports.gi;

/// Data --------------------

var packageSize = (settings) => bytesToString(settings.get_int('package-size-in-bytes'));
var updatePackageSize = (settings, sizeInBytes) => settings.set_int('package-size-in-bytes', sizeInBytes);

var coldPackageSize = (settings) => bytesToString(settings.get_int('cold-package-size-in-bytes'));
var updateColdPackageSize = (settings, sizeInBytes) => settings.set_int('cold-package-size-in-bytes', sizeInBytes);

var refreshTime = (settings) => settings.get_int('refresh-time');
var updateRefreshTime = (settings, refreshTime) => settings.set_int('refresh-time', refreshTime);

var refreshFullUpdateTime = (settings) => settings.get_int('full-refresh-time');
var updateFullRefreshTime = (settings, refreshTime) => settings.set_int('full-refresh-time', refreshTime);

var pagination = (settings) => settings.get_int('pagination');
var updatePagination = (settings, pagination) => settings.set_int('pagination', pagination);

var simpleMode = (settings) => settings.get_boolean('simple-mode');
var coloredMode = (settings) => settings.get_boolean('colored-mode');

function dataConsumptionPerHour(settings) {
    const packageSizeInBytes = settings.get_int('package-size-in-bytes');
    const refreshTime = refreshTime(settings);
    const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60 * 60);

    return bytesToString(dataConsumptionPerHour) + '/h';
}

function fullDataConsumptionPerHour(settings) {
    const packageSizeInBytes = settings.get_int('cold-package-size-in-bytes');
    const refreshTime = refreshFullUpdateTime(settings);
    const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60);

    return bytesToString(dataConsumptionPerHour) + '/h';
}

function fullDataConsumptionPerHour(settings) {
    const hotRefreshSize = settings.get_int('package-size-in-bytes');
    const hotRefreshTime = refreshTime(settings);
    const hotConsumption = ((hotRefreshSize / hotRefreshTime) * 60 * 60);

    const coldRefreshSize = settings.get_int('cold-package-size-in-bytes');
    const coldRefreshTime = refreshFullUpdateTime(settings);
    const coldConsumption = ((coldRefreshSize / coldRefreshTime) * 60);

    return bytesToString(hotConsumption + coldConsumption) + '/h';
}

function ownerAndRepo(settings) {
    const owner = settings.get_string('owner');
    const repo = settings.get_string('repo');

    return {
        owner: owner,
        repo: repo,
    };

}

function isRepositoryEntered(settings) {
    const { owner, repo } = ownerAndRepo(settings);

    if (isEmpty(removeWhiteChars(owner)) || isEmpty(removeWhiteChars(repo))) {
        return false;
    }

    return true;
}

/// Helpers ----------------------

function exec(command) {
    try {
        GLib.spawn_command_line_async(command);
    } catch (e) {
        logError(e);
    }
}

function bytesToString(size) {
    var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i];
}

function isEmpty(str) {
    return (!str || str.length === 0);
}

function removeWhiteChars(str) {
    return str.replace(/\s+/g, '');
}

function openUrl(url) {
    exec('xdg-open ' + url);
}

function openInstallCliScreen() {
    openUrl('https://github.com/cli/cli/blob/trunk/docs/install_linux.md');
}

function openAuthScreen() {
    exec('gnome-terminal -- bash -c "gh auth login --scopes user,repo,workflow"');
}

function isDarkTheme() {
    const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
    const theme = settings.get_string('gtk-theme');

    return theme.replace(/'/g, "").trim().includes("dark");
}

async function executeCommandAsync(commandArray) {
    return new Promise(async (resolve, reject) => {
        try {
            const proc = Gio.Subprocess.new(commandArray, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

            proc.communicate_utf8_async(null, null, (proc, res) => {
                const [, stdout] = proc.communicate_utf8_finish(res);

                if (!proc.get_successful()) {
                    resolve(false);
                }

                resolve(true)
            });
        } catch (e) {
            logError(e);
            resolve(false);
        }
    });
}
