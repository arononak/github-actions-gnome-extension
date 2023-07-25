'use strict';

const { GLib, Gio } = imports.gi;

function isEmpty(str) {
    return (!str || str.length === 0);
}

function removeWhiteChars(str) {
    return str.replace(/\s+/g, '');
}

function formatDate(date) {
    return (new Date(date)).toLocaleFormat('%d.%m.%Y');
}

function bytesToString(size) {
    var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i];
}

function exec(command) {
    try {
        GLib.spawn_command_line_async(command);
    } catch (e) {
        logError(e);
    }
}

function openUrl(url) {
    exec(`xdg-open ${url}`);
}

function openInstallCliScreen() {
    openUrl('https://github.com/cli/cli/blob/trunk/docs/install_linux.md');
}

function openAuthScreen() {
    exec('gnome-terminal -- bash -c "gh auth login --scopes user,repo,workflow"');
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
