'use strict';

const { GLib, Gio } = imports.gi;

/// Data --------------------

var fetchOwner = (settings) => settings.get_string('owner');
var updateOwner = (settings, owner) => settings.set_string('owner', owner);

var fetchRepo = (settings) => settings.get_string('repo');
var updateRepo = (settings, repo) => settings.set_string('repo', repo);

var fetchPackageSize = (settings) => bytesToString(settings.get_int('package-size-in-bytes'));
var updatePackageSize = (settings, sizeInBytes) => settings.set_int('package-size-in-bytes', sizeInBytes);

var fetchColdPackageSize = (settings) => bytesToString(settings.get_int('cold-package-size-in-bytes'));
var updateColdPackageSize = (settings, sizeInBytes) => settings.set_int('cold-package-size-in-bytes', sizeInBytes);

var fetchRefreshTime = (settings) => settings.get_int('refresh-time');
var updateRefreshTime = (settings, refreshTime) => settings.set_int('refresh-time', refreshTime);

var fetchRefreshFullUpdateTime = (settings) => settings.get_int('full-refresh-time');
var updateFullRefreshTime = (settings, refreshTime) => settings.set_int('full-refresh-time', refreshTime);

var fetchPagination = (settings) => settings.get_int('pagination');
var updatePagination = (settings, pagination) => settings.set_int('pagination', pagination);

var fetchSimpleMode = (settings) => settings.get_boolean('simple-mode');
var fetchColoredMode = (settings) => settings.get_boolean('colored-mode');

var formatDate = (date) => (new Date(date)).toLocaleFormat('%d.%m.%Y');

function dataConsumptionPerHour(settings) {
    const packageSizeInBytes = settings.get_int('package-size-in-bytes');
    const refreshTime = fetchRefreshTime(settings);
    const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60 * 60);

    return bytesToString(dataConsumptionPerHour) + '/h';
}

function fullDataConsumptionPerHour(settings) {
    const packageSizeInBytes = settings.get_int('cold-package-size-in-bytes');
    const refreshTime = fetchRefreshFullUpdateTime(settings);
    const dataConsumptionPerHour = ((packageSizeInBytes / refreshTime) * 60);

    return bytesToString(dataConsumptionPerHour) + '/h';
}

function fullDataConsumptionPerHour(settings) {
    const hotRefreshSize = settings.get_int('package-size-in-bytes');
    const hotRefreshTime = fetchRefreshTime(settings);
    const hotConsumption = ((hotRefreshSize / hotRefreshTime) * 60 * 60);

    const coldRefreshSize = settings.get_int('cold-package-size-in-bytes');
    const coldRefreshTime = fetchRefreshFullUpdateTime(settings);
    const coldConsumption = ((coldRefreshSize / coldRefreshTime) * 60);

    return bytesToString(hotConsumption + coldConsumption) + '/h';
}

function ownerAndRepo(settings) {
    const owner = fetchOwner(settings);
    const repo = fetchRepo(settings);

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
