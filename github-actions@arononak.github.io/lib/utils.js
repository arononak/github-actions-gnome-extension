'use strict'

import GLib from 'gi://GLib'

export function isEmpty(str) {
    return !str || str.length === 0
}

export function removeWhiteChars(str) {
    return str.replace(/\s+/g, ``)
}

export function formatDate(date) {
    const options = {
        day: `2-digit`,
        month: `2-digit`,
        year: `numeric`
    }

    return new Date(date).toLocaleDateString(`en-GB`, options)
}

export function bytesToString(size) {
    var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024))
    return `${Number((size / Math.pow(1024, i)).toFixed(2))} ${[`B`, `KB`, `MB`][i]}`
}

export function exec(command) {
    try {
        GLib.spawn_command_line_async(command)
    } catch (e) {
        logError(e)
    }
}

export function openUrl(url) {
    exec(`xdg-open ${url}`)
}

export function openInstallCliScreen() {
    openUrl(`https://github.com/cli/cli/blob/trunk/docs/install_linux.md`)
}

export function openExtensionGithubIssuesPage() {
    openUrl(`https://github.com/arononak/github-actions-gnome-extension/issues/new`)
}

export function openAuthScreen() {
    exec(`gnome-terminal -- bash -c "gh auth login --scopes user,repo,workflow"`)
}

export function copyToClipboard(text) {
    const St = imports.gi.St
    const clipboard = St.Clipboard.get_default()
    clipboard.set_text(St.ClipboardType.CLIPBOARD, text)
}