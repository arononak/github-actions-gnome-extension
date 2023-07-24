'use strict';

const { Gio } = imports.gi;

const extension = imports.misc.extensionUtils.getCurrentExtension();

const { executeCommandAsync } = extension.imports.app.utils;

async function isGitHubCliInstalled() {
    return executeCommandAsync(['gh', '--version']);
}

async function isLogged() {
    return executeCommandAsync(['gh', 'auth', 'token']);
}

async function logoutUser() {
    return executeCommandAsync(['gh', 'auth', 'logout', '--hostname', 'github.com']);
}

async function downloadArtifactFile(downloadUrl, filename) {
    return new Promise(async (resolve, reject) => {
        try {
            const isInstalledCli = await isGitHubCliInstalled();
            if (isInstalledCli == false) {
                return false;
            }

            const logged = await isLogged();
            if (!logged) {
                resolve(false);
                return;
            }

            const proc = Gio.Subprocess.new(
                ['sh', '-c', 'exec gh api ' + downloadUrl + ' > ' + filename],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                const [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
                    resolve(true);
                    return;
                } else {
                    resolve(null);
                }
            });
        } catch (e) {
            logError(e);
            resolve(false);
        }
    });
}

async function executeGithubCliCommand(method, command, pagination = 100) {
    return new Promise(async (resolve, reject) => {
        try {
            const isInstalledCli = await isGitHubCliInstalled();
            if (isInstalledCli == false) {
                return null;
            }

            const logged = await isLogged();

            if (!logged) {
                resolve(null);
                return;
            }

            print(`${method} ${command}`);

            const proc = Gio.Subprocess.new(
                ['gh', 'api', '--method', method, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', `${command}?per_page=${pagination}`],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                const [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
                    if (method == 'DELETE') {
                        resolve('success');
                        return;
                    }

                    const response = JSON.parse(stdout);
                    response['_size_'] = stdout.length; /// Welcome in JS World :D

                    resolve(response);
                    return;
                } else {
                    resolve(null);
                }
            });
        } catch (e) {
            logError(e);
            resolve(null);
        }
    });
}
