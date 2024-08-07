'use strict'

import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'
import Adw from 'gi://Adw'
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

import { PrefsController } from './lib/prefs_controller.js'

import {
    createButtonRow,
    createEntityRow,
    createSpinButtonRow,
    createToggleRow,
    createComboBox,
} from './lib/prefs_utils.js'

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

            cliVersion,

            version,
            versionDescription,
        } = prefsController.fetchData()

        window.set_default_size(600, 1780)

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

        if (hiddenMode) {
            const extendedColoredMode = createToggleRow({
                title: `Extended colored mode (Hidden feature)`,
                subtitle: `More intense colored mode`,
                value: coloredMode,
                onSwitchButtonCreated: (switchButton) => settings.bind(`extended-colored-mode`, switchButton, `active`, Gio.SettingsBindFlags.DEFAULT),
            })

            appearanceGroup.add(extendedColoredMode)
        } else {
            const starRow = createButtonRow({
                title: `Unlock hidden features`,
                buttonLabel: `Give me a star!`,
                onButtonPressed: () => prefsController.onStarClicked(),
            })

            appearanceGroup.add(starRow)
        }

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
            subtitle: `Set to 0 for unlimited data downloads.\nVERY IMPORTANT - Do not enable unlimited data for large repositories 5000+ commits.`,
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

        const openCacheRow = createButtonRow({
            title: `Cache directory`,
            subtitle: `Opens the folder with the data cache`,
            buttonLabel: `Open`,
            onButtonPressed: () => prefsController.onOpenCacheFolder(),
        })

        otherGroup.add(openCacheRow)

        const bugBountyRow = createButtonRow({
            title: `Bug Bounty program`,
            subtitle: `If you find an error and it is corrected in the next version, your login and email will be on the honor list in the extension`,
            buttonLabel: `Report !`,
            onButtonPressed: () => prefsController.onOpenExtensionGithubIssuesPageClicked(),
        })
        otherGroup.add(bugBountyRow)

        const honorRollRow = createButtonRow({
            title: `Honor Roll`,
            subtitle: `List of people who helped develop this extension`,
            buttonLabel: `Show`,
            onButtonPressed: () => {
                let dialog = new Gtk.Dialog({
                    title: `Honor Roll`,
                    use_header_bar: true,
                    modal: true,
                })

                let label = new Gtk.Label({
                    label: `\n Empty list :/ \n\n If you had any contribution and you agree to include your nickname + email. \n Please send me an email: arononak@gmail.com `,
                })
                label.set_halign(Gtk.Align.CENTER)
                label.set_valign(Gtk.Align.CENTER)
                label.set_hexpand(true)
                label.set_vexpand(false)

                dialog.set_default_size(300, 200)
                dialog.get_content_area().append(label)
                dialog.show()
            },
        })
        otherGroup.add(honorRollRow)

        const recommendedCliVersionRow = new Adw.ActionRow({
            title: `GitHub CLI Version`,
            subtitle: `Recommended version 2.45.0`,
        })
        recommendedCliVersionRow.add_suffix(new Gtk.Label({ label: cliVersion, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }))
        otherGroup.add(recommendedCliVersionRow)

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
