'use strict'

import { PrefsController } from './lib/prefs_controller.js'

import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'
import Adw from 'gi://Adw'
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function createButtonRow({ title, subtitle, buttonLabel, onButtonPressed }) {
    const button = new Gtk.Button({ label: buttonLabel })
    button.connect('clicked', onButtonPressed)
    button.margin_top = 8
    button.margin_bottom = 8

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })

    row.add_suffix(button)

    return row
}

function createEntityRow({ title, text, onChanged }) {
    const entry = new Gtk.Entry({
        buffer: new Gtk.EntryBuffer({ text: text }),
        hexpand: true,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
    })
    entry.set_size_request(300, -1)
    entry.connect('changed', (widget) => {
        const text = entry.get_buffer().text

        if (text) {
            onChanged(text)
        }
    })

    const row = new Adw.ActionRow({ title: title })
    row.add_suffix(entry)
    row.activatable_widget = entry

    return row
}

function createSpinButtonRow({ title, subtitle, value, lower, upper, onSpinButtonCreated }) {
    const spinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 })
    spinButton.wrap = true
    spinButton.width_chars = 2
    spinButton.margin_top = 8
    spinButton.margin_bottom = 8
    spinButton.adjustment = new Gtk.Adjustment({
        value: value,
        lower: lower,
        upper: upper,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    })

    onSpinButtonCreated(spinButton)

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })

    row.add_suffix(spinButton)
    row.activatable_widget = spinButton

    return row
}

function createToggleRow({ title, subtitle, value, onSwitchButtonCreated }) {
    const switchButton = new Gtk.Switch({ active: value, valign: Gtk.Align.CENTER })
    onSwitchButtonCreated(switchButton)

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })
    row.add_suffix(switchButton)
    row.activatable_widget = switchButton

    return row
}

export default class GithubActionsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings()

        const prefsController = new PrefsController(settings)
        const {
            enabledExtension,

            owner,
            repo,
            refreshTime,
            coldRefreshTime,
            packageSize,
            coldPackageSize,
            pagination,

            showNotifications,
            simpleMode,
            coloredMode,
            uppercaseMode,
            iconPosition,
            showIcon,

            hiddenMode,

            version,
            versionDescription,
        } = prefsController.fetchData()

        window.set_default_size(600, 1290)

        const enabledRow = createToggleRow({
            title: 'Enabled',
            value: enabledExtension,
            onSwitchButtonCreated: (switchButton) => settings.bind('extension-enabled', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
        })

        const iconPositionRow = createSpinButtonRow({
            title: 'Position in top panel',
            subtitle: `Suggested by @thyttan`,
            value: iconPosition,
            lower: -100,
            upper: 100,
            onSpinButtonCreated: (spinButton) => settings.bind('icon-position', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
        })

        /// Repository
        const ownerRow = createEntityRow({
            title: 'Owner',
            text: owner,
            onChanged: (text) => prefsController.updateOwner(text),
        })

        const repoRow = createEntityRow({
            title: 'Repo',
            text: repo,
            onChanged: (text) => prefsController.updateRepo(text),
        })

        /// Appearance
        const showNotificationsRow = createToggleRow({
            title: 'Show notifications',
            subtitle: 'System notifications when the build is completed and others',
            value: showNotifications,
            onSwitchButtonCreated: (switchButton) => settings.bind('show-notifications', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
        })

        const simpleModeRow = createToggleRow({
            title: 'Simple mode',
            subtitle: 'Mode for minimalists containing the most important functionalities',
            value: simpleMode,
            onSwitchButtonCreated: (switchButton) => settings.bind('simple-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
        })

        const coloredModeRow = createToggleRow({
            title: 'Colored mode',
            subtitle: 'Colored mode for colorblind, aesthetes and gay people',
            value: coloredMode,
            onSwitchButtonCreated: (switchButton) => settings.bind('colored-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
        })

        const uppercaseModeRow = createToggleRow({
            title: 'UpperCase mode',
            value: uppercaseMode,
            onSwitchButtonCreated: (switchButton) => settings.bind('uppercase-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
        })

        const showIconRow = createToggleRow({
            title: 'Show icon',
            subtitle: 'Show github icon on system indicator',
            value: showIcon,
            onSwitchButtonCreated: (switchButton) => settings.bind('show-icon', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
        })

        const changeIconRow = createButtonRow({
            title: 'Change icon',
            subtitle: 'Don\'t open it in gedit and don\'t change the color :D',
            buttonLabel: 'Change',
            onButtonPressed: () => prefsController.onOpenExtensionFolderClicked(),
        })

        const appearanceGroup = new Adw.PreferencesGroup({ title: 'Appearance' })
        appearanceGroup.add(showNotificationsRow)
        appearanceGroup.add(simpleModeRow)
        appearanceGroup.add(coloredModeRow)
        appearanceGroup.add(uppercaseModeRow)
        appearanceGroup.add(showIconRow)
        appearanceGroup.add(changeIconRow)

        /// Refresh
        const refreshStatusRow = createSpinButtonRow({
            title: 'Github Actions (in seconds)',
            subtitle: `Package size: ${packageSize}`,
            value: refreshTime,
            lower: 1,
            upper: 60,
            onSpinButtonCreated: (spinButton) => settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
        })

        const fullRefreshRow = createSpinButtonRow({
            title: 'Data (in minutes)',
            subtitle: `Package size: ${coldPackageSize}`,
            value: coldRefreshTime,
            lower: 1,
            upper: 60,
            onSpinButtonCreated: (spinButton) => settings.bind('full-refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
        })

        const paginationRow = createSpinButtonRow({
            title: 'Pagination:',
            value: pagination,
            lower: 1,
            upper: 100,
            onSpinButtonCreated: (spinButton) => settings.bind('pagination', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
        })

        const generalGroup = new Adw.PreferencesGroup({ title: 'General' })
        generalGroup.add(enabledRow)
        generalGroup.add(iconPositionRow)

        const watchedGroup = new Adw.PreferencesGroup({ title: 'Watched repository' })
        watchedGroup.add(ownerRow)
        watchedGroup.add(repoRow)

        const refreshStatusGroup = new Adw.PreferencesGroup({ title: 'Refresh settings' })
        refreshStatusGroup.add(refreshStatusRow)
        refreshStatusGroup.add(fullRefreshRow)
        refreshStatusGroup.add(paginationRow)

        /// Other
        const otherGroup = new Adw.PreferencesGroup({ title: 'Other' })
        if (hiddenMode) {
            const extendedColoredMode = createToggleRow({
                title: 'Extended colored mode (Hidden feature)',
                subtitle: 'More intense colored mode',
                value: coloredMode,
                onSwitchButtonCreated: (switchButton) => settings.bind('extended-colored-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
            })

            otherGroup.add(extendedColoredMode)
        } else {
            const starRow = createButtonRow({
                title: 'Unlock hidden features',
                buttonLabel: 'Give me a star!',
                onButtonPressed: () => prefsController.onStarClicked(),
            })

            otherGroup.add(starRow)
        }

        const bugBountyRow = createButtonRow({
            title: 'Bug Bounty program',
            subtitle: 'If you find an error in the application and it is corrected in the next version, your login and email will be on the honor list in the extension',
            buttonLabel: 'Report !',
            onButtonPressed: () => prefsController.onOpenExtensionGithubIssuesPageClicked(),
        })
        otherGroup.add(bugBountyRow)

        const versionRow = new Adw.ActionRow({
            title: 'Version:',
            subtitle: versionDescription,
        })
        versionRow.add_suffix(new Gtk.Label({ label: version, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }))
        otherGroup.add(versionRow)

        const page = new Adw.PreferencesPage()
        page.add(generalGroup)
        page.add(watchedGroup)
        page.add(refreshStatusGroup)
        page.add(appearanceGroup)
        page.add(otherGroup)

        window.add(page)
    }
}
