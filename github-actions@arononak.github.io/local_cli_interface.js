'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { GLib, Gio } = imports.gi;
const ByteArray = imports.byteArray;

async function isLogged() {
    return new Promise((resolve, reject) => {
        try {
            let [, stdout, stderr, status] = GLib.spawn_command_line_sync('gh auth token');

            if (status !== 0) {
                if (stderr instanceof Uint8Array) {
                    stderr = ByteArray.toString(stderr); /// no auth token
                }

                resolve(false);
                return;
            }

            if (stdout instanceof Uint8Array) {
                stdout = ByteArray.toString(stdout);
            }

            resolve(true);
        } catch (e) {
            logError(e);
            resolve(false);
        }
    });
}

async function logout() {
    return new Promise((resolve, reject) => {
        try {
            let [, stdout, stderr, status] = GLib.spawn_command_line_sync('gh auth logout --hostname github.com');

            if (status !== 0) {
                if (stderr instanceof Uint8Array) {
                    stderr = ByteArray.toString(stderr);
                    print(stderr);
                }

                resolve(false);
                return;
            }

            if (stdout instanceof Uint8Array) {
                stdout = ByteArray.toString(stdout);
                print(stdout);
            }

            resolve(true);
        } catch (e) {
            logError(e);
            resolve(false);
        }
    });
}

async function downloadArtifact(downloadUrl, filename) {
    const logged = await isLogged();

    return new Promise((resolve, reject) => {
        try {
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
                    throw new Error(stderr);
                }
            });
        } catch (e) {
            logError(e);
            resolve(false);
        }
    });
}

async function executeGithubCliCommand(method, command, pagination = 100) {
    const logged = await isLogged();

    return new Promise((resolve, reject) => {
        try {
            if (!logged) {
                resolve(null);
                return;
            }

            print(method + ' ' + command);

            const proc = Gio.Subprocess.new(
                ['gh', 'api', '--method', method, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', command + '?per_page=' + pagination],
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
                    throw new Error(stderr);
                }
            });
        } catch (e) {
            logError(e);
            resolve(null);
        }
    });
}