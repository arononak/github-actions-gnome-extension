'use strict'

import Gio from 'gi://Gio'

export async function isGitHubCliInstalled() {
    return executeCommandAsync([`gh`, `--version`])
}

export async function isLogged() {
    return executeCommandAsync([`gh`, `auth`, `token`])
}

export async function logoutUser() {
    return executeCommandAsync([`gh`, `auth`, `logout`, `--hostname`, `github.com`])
}

async function executeCommandAsync(commandArray) {
    return new Promise(async (resolve, reject) => {
        try {
            const process = Gio.Subprocess.new(commandArray, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)

            process.communicate_utf8_async(null, null, (proc, res) => {
                const [, stdout] = proc.communicate_utf8_finish(res)

                if (!proc.get_successful()) {
                    resolve(false)
                }

                resolve(true)
            })
        } catch (e) {
            logError(e)
            resolve(false)
        }
    })
}

export async function authStatus() {
    return new Promise(async (resolve, reject) => {
        try {
            const process = Gio.Subprocess.new([`gh`, `auth`, `status`], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)

            process.communicate_utf8_async(null, null, (proc, res) => {
                const [status, stdout, stderr] = proc.communicate_utf8_finish(res)

                if (!proc.get_successful()) {
                    resolve(null)
                }

                // Github CLI put a response in stderr, why ? idk
                resolve(stderr)
            })
        } catch (e) {
            logError(e)
            resolve(null)
        }
    })
}

export async function token() {
    return new Promise(async (resolve, reject) => {
        try {
            const process = Gio.Subprocess.new([`gh`, `auth`, `token`], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)

            process.communicate_utf8_async(null, null, (proc, res) => {
                const [status, stdout, stderr] = proc.communicate_utf8_finish(res)

                if (!proc.get_successful()) {
                    resolve(null)
                }

                resolve(stdout)
            })
        } catch (e) {
            logError(e)
            resolve(null)
        }
    })
}

export async function downloadArtifactFile(downloadUrl, filename) {
    return new Promise(async (resolve, reject) => {
        try {
            const isInstalledCli = await isGitHubCliInstalled()
            if (isInstalledCli == false) {
                resolve(false)
                return
            }

            const logged = await isLogged()
            if (!logged) {
                resolve(false)
                return
            }

            const process = Gio.Subprocess.new(
                [`sh`, `-c`, `exec gh api ${downloadUrl} > ${filename}`],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            )

            process.communicate_utf8_async(null, null, (proc, res) => {
                const [, stdout, stderr] = proc.communicate_utf8_finish(res)

                if (proc.get_successful()) {
                    resolve(true)
                } else {
                    resolve(null)
                }
            })
        } catch (e) {
            logError(e)
            resolve(false)
        }
    })
}

export async function executeGithubCliCommand(method, command, pagination = 100) {
    return new Promise(async (resolve, reject) => {
        try {
            const isInstalledCli = await isGitHubCliInstalled()
            if (isInstalledCli == false) {
                resolve(null)
                return
            }

            const logged = await isLogged()
            if (!logged) {
                resolve(null)
                return
            }

            const process = Gio.Subprocess.new(
                [`gh`, `api`, `--method`, method, `-H`, `Accept: application/vnd.github+json`, `-H`, `X-GitHub-Api-Version: 2022-11-28`, `${command}?per_page=${pagination}`],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            )

            process.communicate_utf8_async(null, null, (proc, res) => {
                const [status, stdout, stderr] = proc.communicate_utf8_finish(res)

                print(`${method} ${command} ${stdout.length} ${stderr.length}`)

                // [NO_INTERNET_CONNECTION]
                // stdout:
                // stderr: error connecting to api.github.com

                // [INCORRECT_REQUEST]
                // stdout: {"message":"Not Found","documentation_url":"https://docs.github.com/rest/actions/workflow-runs#list-workflow-runs-for-a-repository"}
                // stderr: gh: Not Found (HTTP 404)

                if (proc.get_successful()) {
                    if (stdout.length == 0 && stderr.length == 0) {
                        resolve(`success`)
                        return
                    }

                    const response = JSON.parse(stdout)
                    response[`_size_`] = stdout.length // Welcome in JS World :D
                    resolve(response)
                } else {
                    if (stdout.length < 2) {
                        resolve(`no-internet-connection`)
                        return
                    }

                    resolve(null)
                }
            })
        } catch (e) {
            logError(e)
            resolve(null)
        }
    })
}
