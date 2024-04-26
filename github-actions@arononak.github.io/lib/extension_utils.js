'use strict'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Config from 'resource:///org/gnome/shell/misc/config.js'

import {
    removeWhiteChars as _removeWhiteChars,
    openUrl as _openUrl,
    openInstallCliScreen as _openInstallCliScreen,
    openAuthScreen as _openAuthScreen,
    bytesToString as _bytesToString,
    isEmpty as _isEmpty,
} from './utils.js'

import St from 'gi://St'

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

export function isEmpty(str) {
    return _isEmpty(str)
}

export function copyToClipboard(text) {
    const clipboard = St.Clipboard.get_default()
    clipboard.set_text(St.ClipboardType.CLIPBOARD, text)
}

export function isGnome45() {
    const [major, minor] = Config.PACKAGE_VERSION.split(`.`).map((s) => Number(s))
    return major == 45
}
