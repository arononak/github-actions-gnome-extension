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

var fetchUserActionsMinutes = async function (username) {
    return executeGithubCliCommand('/users/' + username + '/settings/billing/actions');
}

var fetchUser = async function () {
    return executeGithubCliCommand('/user');
}

var fetchWorkflowRuns = async function (owner, repo) {
    return executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/runs');
}

async function executeGithubCliCommand(command) {
    const logged = await isLogged();

    return new Promise((resolve, reject) => {
        try {
            if (!logged) {
                resolve(null);
                return;
            }

            let proc = Gio.Subprocess.new(
                ['gh', 'api', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', command],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
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