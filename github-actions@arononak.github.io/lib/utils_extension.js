import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

export function extensionPath() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io') 
    return extension.path
}

export function extensionSettings() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io') 
    return extension.getSettings('org.gnome.shell.extensions.github-actions')
}

export function extensionOpenPreferences() {
    const extension = Extension.lookupByUUID('github-actions@arononak.github.io') 
    return extension.openPreferences()
}
