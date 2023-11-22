import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

import {
    removeWhiteChars as _removeWhiteChars,
    openUrl as _openUrl,
    openInstallCliScreen as _openInstallCliScreen,
    openAuthScreen as _openAuthScreen,
    bytesToString as _bytesToString,
    formatDate as _formatDate,
    isEmpty as _isEmpty,
    copyToClipboard as _copyToClipboard,
} from './utils.js'

export function extensionSettings() {
    const extension = Extension.lookupByUUID(`github-actions@arononak.github.io`)
    return extension.getSettings(`org.gnome.shell.extensions.github-actions`)
}

export function extensionPath() {
    const extension = Extension.lookupByUUID(`github-actions@arononak.github.io`)
    return extension.path
}

export function extensionOpenPreferences() {
    const extension = Extension.lookupByUUID(`github-actions@arononak.github.io`)
    return extension.openPreferences()
}

export function removeWhiteChars(str) {
    return _removeWhiteChars(str)
}

export function openUrl(str) {
    return _openUrl(str)
}

export function openInstallCliScreen() {
    return _openInstallCliScreen()
}

export function openAuthScreen() {
    return _openAuthScreen()
}

export function bytesToString(size) {
    return _bytesToString(size)
}

export function formatDate(date) {
    return _formatDate(date)
}

export function isEmpty(str) {
    return _isEmpty(str)
}

export function copyToClipboard(text) {
    return _copyToClipboard(text)
}
