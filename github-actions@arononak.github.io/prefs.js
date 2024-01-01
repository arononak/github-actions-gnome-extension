'use strict'

import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'
import Adw from 'gi://Adw'
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

import { PrefsController } from './lib/prefs_controller.js'

function createButtonRow({ title, subtitle, buttonLabel, onButtonPressed }) {
    const button = new Gtk.Button({ label: buttonLabel })
    button.set_size_request(120, -1)
    button.connect(`clicked`, onButtonPressed)
    button.margin_top = 16
    button.margin_bottom = 16

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })

    row.add_suffix(button)

    return row
}

function createEntityRow({ title, text, onChanged }) {
    const entry = new Gtk.Entry({
        buffer: new Gtk.EntryBuffer({ text }),
        hexpand: true,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
    })
    entry.set_size_request(300, -1)
    entry.connect(`changed`, (widget) => {
        const entryText = entry.get_buffer().text

        if (entryText !== null && entryText !== undefined) {
            onChanged(entryText);
        }
    })

    const row = new Adw.ActionRow({ title })
    row.add_suffix(entry)
    row.activatable_widget = entry

    return row
}

function createSpinButtonRow({ title, subtitle, value, lower, upper, onSpinButtonCreated }) {
    const spinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 })
    spinButton.set_size_request(120, -1)
    spinButton.wrap = true
    spinButton.width_chars = 2
    spinButton.margin_top = 8
    spinButton.margin_bottom = 8
    spinButton.adjustment = new Gtk.Adjustment({
        value,
        lower,
        upper,
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

function createComboBox({ title, subtitle, value, values, onChanged }) {
    const comboBox = new Gtk.ComboBoxText()
    comboBox.set_size_request(120, -1)
    comboBox.margin_top = 8
    comboBox.margin_bottom = 8
    values.forEach((element) => comboBox.append_text(element))

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })
    row.add_suffix(comboBox)
    row.activatable_widget = comboBox

    const selectedIndex = values.indexOf(value);
    comboBox.set_active(selectedIndex)

    comboBox.connect(`changed`, (widget) => {
        const text = widget.get_active_text();
        onChanged(text)
        row.subtitle = text
    })

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
            iconPositionBox,
            iconPosition,
            showIcon,
            textLengthLimiter,
            locale,

            hiddenMode,

            version,
            versionDescription,
        } = prefsController.fetchData()

        window.set_default_size(600, 1600)

        const enabledRow = createToggleRow({
            title: `Enabled`,
            value: enabledExtension,
            onSwitchButtonCreated: (switchButton) => settings.bind(`extension-enabled`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
        })

        const iconPositionComboBox = createComboBox({
            title: `Position in top panel`,
            value: iconPositionBox,
            values: [`left`, `center`, `right`],
            onChanged: (text) => prefsController.updatePositionBox(text)
        })

        const iconPositionRow = createSpinButtonRow({
            title: `Position index`,
            subtitle: `Suggested by @thyttan`,
            value: iconPosition,
            lower: -100,
            upper: 100,
            onSpinButtonCreated: (spinButton) => settings.bind(`icon-position`, spinButton, `value`, Gio.SettingsBindFlags.DEFAULT),
        })

        // Repository
        const ownerRow = createEntityRow({
            title: `Owner`,
            text: owner,
            onChanged: (text) => prefsController.updateOwner(text),
        })

        const repoRow = createEntityRow({
            title: `Repo`,
            text: repo,
            onChanged: (text) => prefsController.updateRepo(text),
        })

        // Appearance
        const showNotificationsRow = createToggleRow({
            title: `Show notifications`,
            subtitle: `System notifications when the build is completed and others`,
            value: showNotifications,
            onSwitchButtonCreated: (switchButton) => settings.bind(`show-notifications`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
        })

        const simpleModeRow = createToggleRow({
            title: `Simple mode`,
            subtitle: `Mode for minimalists containing the most important functionalities`,
            value: simpleMode,
            onSwitchButtonCreated: (switchButton) => settings.bind(`simple-mode`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
        })

        const coloredModeRow = createToggleRow({
            title: `Colored mode`,
            subtitle: `Colored mode for colorblind, aesthetes and gay people`,
            value: coloredMode,
            onSwitchButtonCreated: (switchButton) => settings.bind(`colored-mode`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
        })

        const uppercaseModeRow = createToggleRow({
            title: `UpperCase mode`,
            value: uppercaseMode,
            onSwitchButtonCreated: (switchButton) => settings.bind(`uppercase-mode`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
        })

        const showIconRow = createToggleRow({
            title: `Show icon`,
            subtitle: `Show github icon on system indicator`,
            value: showIcon,
            onSwitchButtonCreated: (switchButton) => settings.bind(`show-icon`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
        })

        const changeIconRow = createButtonRow({
            title: `Change icon`,
            subtitle: `Don't open it in gedit and don't change the color :D`,
            buttonLabel: `Change`,
            onButtonPressed: () => prefsController.onOpenExtensionFolderClicked(),
        })

        const textLengthLimiterSpinRow = createSpinButtonRow({
            title: `Text length limiter`,
            subtitle: `Limits the length of text in list items`,
            value: textLengthLimiter,
            lower: 10,
            upper: 500,
            onSpinButtonCreated: (spinButton) => settings.bind(`text-length-limiter`, spinButton, `value`, Gio.SettingsBindFlags.DEFAULT),
        })

        const localeComboBox = createComboBox({
            title: `Date format`,
            value: locale,
            values: [`pl-PL`, `en-GB`, `en-US`],
            onChanged: (text) => prefsController.updateLocale(text)
        })

        const appearanceGroup = new Adw.PreferencesGroup({ title: `Appearance` })
        appearanceGroup.add(showNotificationsRow)
        appearanceGroup.add(simpleModeRow)
        appearanceGroup.add(coloredModeRow)
        appearanceGroup.add(uppercaseModeRow)
        appearanceGroup.add(showIconRow)
        appearanceGroup.add(changeIconRow)
        appearanceGroup.add(textLengthLimiterSpinRow)
        appearanceGroup.add(localeComboBox)

        // Refresh
        const refreshStatusRow = createSpinButtonRow({
            title: `Github Actions (in seconds)`,
            subtitle: `Package size: ${packageSize}`,
            value: refreshTime,
            lower: 1,
            upper: 60,
            onSpinButtonCreated: (spinButton) => settings.bind(`refresh-time`, spinButton, `value`, Gio.SettingsBindFlags.DEFAULT),
        })

        const fullRefreshRow = createSpinButtonRow({
            title: `Data (in minutes)`,
            subtitle: `Package size: ${coldPackageSize}`,
            value: coldRefreshTime,
            lower: 1,
            upper: 60,
            onSpinButtonCreated: (spinButton) => settings.bind(`full-refresh-time`, spinButton, `value`, Gio.SettingsBindFlags.DEFAULT),
        })

        const paginationRow = createSpinButtonRow({
            title: `Pagination`,
            subtitle: `Set to 0 for unlimited data downloads`,
            value: pagination,
            lower: 0,
            upper: 100,
            onSpinButtonCreated: (spinButton) => settings.bind(`pagination`, spinButton, `value`, Gio.SettingsBindFlags.DEFAULT),
        })

        const generalGroup = new Adw.PreferencesGroup({ title: `General` })
        generalGroup.add(enabledRow)
        generalGroup.add(iconPositionComboBox)
        generalGroup.add(iconPositionRow)

        const watchedGroup = new Adw.PreferencesGroup({ title: `Watched repository` })
        watchedGroup.add(ownerRow)
        watchedGroup.add(repoRow)

        const refreshStatusGroup = new Adw.PreferencesGroup({ title: `Refresh settings` })
        refreshStatusGroup.add(refreshStatusRow)
        refreshStatusGroup.add(fullRefreshRow)
        refreshStatusGroup.add(paginationRow)

        // Other
        const otherGroup = new Adw.PreferencesGroup({ title: `Other` })

        const homepageRow = createButtonRow({
            title: `Homepage`,
            subtitle: `The central node of this project`,
            buttonLabel: `Open`,
            onButtonPressed: () => prefsController.onOpenHomepageClicked(),
        })
        otherGroup.add(homepageRow)

        const bugBountyRow = createButtonRow({
            title: `Bug Bounty program`,
            subtitle: `If you find an error and it is corrected in the next version, your login and email will be on the honor list in the extension`,
            buttonLabel: `Report !`,
            onButtonPressed: () => prefsController.onOpenExtensionGithubIssuesPageClicked(),
        })
        otherGroup.add(bugBountyRow)

        const newExtensionRow = createButtonRow({
            title: `New extension`,
            subtitle: `Check out my new extension`,
            buttonLabel: `Check`,
            onButtonPressed: () => prefsController.onOpenNewExtensionClicked(),
        })
        otherGroup.add(newExtensionRow)

        if (hiddenMode) {
            const extendedColoredMode = createToggleRow({
                title: `Extended colored mode (Hidden feature)`,
                subtitle: `More intense colored mode`,
                value: coloredMode,
                onSwitchButtonCreated: (switchButton) => settings.bind(`extended-colored-mode`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
            })

            otherGroup.add(extendedColoredMode)
        } else {
            const starRow = createButtonRow({
                title: `Unlock hidden features`,
                buttonLabel: `Give me a star!`,
                onButtonPressed: () => prefsController.onStarClicked(),
            })

            otherGroup.add(starRow)
        }

        const versionRow = new Adw.ActionRow({
            title: `Version`,
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
