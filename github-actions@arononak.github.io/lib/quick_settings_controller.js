'use strict'

import { createAppGioIcon, isDarkTheme, AppStatusColor } from './widgets.js'
import { SettingsRepository } from './settings_repository.js'

import GObject from 'gi://GObject'
import Gio from 'gi://Gio'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

function createIconColor(isDarkMode, isEnabled) {
    if (isDarkMode === true && isEnabled === true) {
        return AppStatusColor.WHITE
    } else if (isDarkMode === true && isEnabled === false) {
        return AppStatusColor.WHITE
    } else if (isDarkMode === false && isEnabled === true) {
        return AppStatusColor.WHITE
    } else if (isDarkMode === false && isEnabled === false) {
        return AppStatusColor.BLACK
    }
}

export class EnabledExtensionToggle extends QuickSettings.QuickToggle {
    static {
        GObject.registerClass(this)
    }

    _init() {
        super._init({
            title: 'Github Actions',
            toggleMode: true,
        })
        this.label = 'Github Actions'

        const extension = Extension.lookupByUUID('github-actions@arononak.github.io')
        this.settings = extension.getSettings('org.gnome.shell.extensions.github-actions')
        
        const settingsRepository = new SettingsRepository(this.settings)
        const enabled = settingsRepository.fetchEnabledExtension()
        const darkMode = isDarkTheme()
        const iconColor = createIconColor(darkMode, enabled)
        this.gicon = createAppGioIcon(iconColor)

        this.settings.bind(
            'extension-enabled',
            this,
            'checked',
            Gio.SettingsBindFlags.DEFAULT,
        )
    }
}

export class QuickSettingsIndicator extends QuickSettings.SystemIndicator {
    static {
        GObject.registerClass(this)
    }

    _init() {
        super._init()

        this.quickSettingsItems.push(new EnabledExtensionToggle())
        this.connect('destroy', () => {
            this.quickSettingsItems.forEach(item => item.destroy())
        })
        Main.panel.statusArea.quickSettings.addExternalIndicator(this, 1);
    }
}