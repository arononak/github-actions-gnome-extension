import {
    removeWhiteChars as _removeWhiteChars,
    openUrl as _openUrl,
    openInstallCliScreen as _openInstallCliScreen,
    openAuthScreen as _openAuthScreen,
    bytesToString as _bytesToString,
    formatDate as _formatDate,
    isEmpty as _isEmpty,
} from './utils.js'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

export function extensionSettings() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io') 
    return extension.getSettings('org.gnome.shell.extensions.github-actions')
}

export function extensionPath() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io') 
    return extension.path
}

export function extensionOpenPreferences() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io') 
    return extension.openPreferences()
}

export function removeWhiteChars(str) { return _removeWhiteChars(str) }
export function openUrl(str) { return _openUrl(str) }
export function openInstallCliScreen(str) { return _openInstallCliScreen(str) }
export function openAuthScreen(str) { return _openAuthScreen(str) }
export function bytesToString(str) { return _bytesToString(str) }
export function formatDate(str) { return _formatDate(str) }
export function isEmpty(str) { return _isEmpty(str) }
