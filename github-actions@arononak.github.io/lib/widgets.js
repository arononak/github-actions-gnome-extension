'use strict'

import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js'
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js'
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import {
    extensionPath,
    extensionSettings as _extensionSettings,
    openUrl as _openUrl,
    openInstallCliScreen as _openInstallCliScreen,
    openAuthScreen as _openAuthScreen,
    bytesToString as _bytesToString,
    formatDate as _formatDate,
    extensionOpenPreferences as _extensionOpenPreferences,
} from './extension_utils.js'

export function extensionSettings()        { return _extensionSettings() }
export function openUrl()                  { return _openUrl() }
export function openInstallCliScreen()     { return _openInstallCliScreen() }
export function openAuthScreen()           { return _openAuthScreen() }
export function bytesToString()            { return _bytesToString() }
export function formatDate(date)           { return _formatDate(date) }
export function extensionOpenPreferences() { return _extensionOpenPreferences() }

export const AppStatusColor = {
    WHITE: {
        icon: '/assets/github_white.svg',
        innerIcon: '/assets/github_white.svg',
        innerIconDark: '/assets/github_black.svg',
        color: '#FFFFFF',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#F0F0F0',
        borderColor: '#F0F0F0',
        backgroundColorDark: '#F0F0F0',
        borderColorDark: '#F0F0F0',
    },
    BLACK: {
        icon: '/assets/github_black.svg',
        innerIcon: '/assets/github_black.svg',
        innerIconDark: '/assets/github_white.svg',
        color: '#555555',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#999999',
        borderColor: '#F0F0F0',
        backgroundColorDark: '#999999',
        borderColorDark: '#F0F0F0',
    },
    GRAY: {
        icon: '/assets/github_white.svg',
        innerIcon: '/assets/github_black.svg',
        innerIconDark: '/assets/github_white.svg',
        color: '#757575',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#9E9E9E',
        borderColor: '#9E9E9E',
        backgroundColorDark: '#9E9E9E',
        borderColorDark: '#9E9E9E',
    },
    GREEN: {
        icon: '/assets/github_white.svg',
        innerIcon: '/assets/github_black.svg',
        innerIconDark: '/assets/github_white.svg',
        color: '#00FF66',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#60D37A',
        borderColor: '#2F883A',
        backgroundColorDark: '#43A047',
        borderColorDark: '#2E7D32',
    },
    BLUE: {
        icon: '/assets/github_white.svg',
        innerIcon: '/assets/github_black.svg',
        innerIconDark: '/assets/github_white.svg',
        color: '#64B5F6',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#64B5F6',
        borderColor: '#1565C0',
        backgroundColorDark: '#2196F3',
        borderColorDark: '#0D47A1',
    },
    RED: {
        icon: '/assets/github_white.svg',
        innerIcon: '/assets/github_black.svg',
        innerIconDark: '/assets/github_white.svg',
        color: '#EF5350',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#EF6C57',
        borderColor: '#E57364',
        backgroundColorDark: '#E53935',
        borderColorDark: '#C62828',
    },
}

export function createAppGioIcon(appStatusColor) {
    return Gio.icon_new_for_string(extensionPath() + appStatusColor.icon)
}

export function createAppGioIconInner(appStatusColor) {
    const darkTheme = isDarkTheme()

    return darkTheme
        ? Gio.icon_new_for_string(extensionPath() + appStatusColor.innerIconDark)
        : Gio.icon_new_for_string(extensionPath() + appStatusColor.innerIcon)
}

export function anvilIcon() {
    const darkTheme = isDarkTheme()

    return darkTheme
        ? Gio.icon_new_for_string(extensionPath() + '/assets/anvil_white.svg')
        : Gio.icon_new_for_string(extensionPath() + '/assets/anvil_black.svg')
}

export function appIcon() {
    const darkTheme = isDarkTheme()

    return darkTheme
        ? createAppGioIcon(AppStatusColor.WHITE)
        : createAppGioIcon(AppStatusColor.BLACK)
}

export function conclusionIconName(conclusion) {
    if (conclusion == 'success') {
        return 'emblem-default'
    } else if (conclusion == 'failure') {
        return 'emblem-unreadable'
    } else if (conclusion == 'cancelled') {
        return 'emblem-unreadable'
    } else {
        return 'emblem-synchronizing-symbolic'
    }
}

export function isDarkTheme() {
    const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' })
    const theme = settings.get_string('gtk-theme')

    return theme.replace(/'/g, "").trim().includes("dark")
}

export class RoundedButton extends St.Button {
    static {
        GObject.registerClass(this)
    }

    constructor({ iconName, text }) {
        super({ style_class: 'button github-actions-button-action' })

        this.child = new St.BoxLayout()

        if (iconName != null) {
            this.icon = new St.Icon({ icon_name: iconName, icon_size: 20 })
            this.child.add(this.icon)
        }

        if (text != null) {
            /// this.label from St.Button is used
            this.boxLabel = new St.Label({ text: text, y_align: Clutter.ActorAlign.CENTER, y_expand: true })
            this.child.add(this.boxLabel)
            this.setTextColor(null)
        }
    }

    setColor({ backgroundColor, borderColor }) {
        this.style = `background-color: ${backgroundColor}; border-color: ${borderColor};`
    }

    setTextColor(textColor) {
        this.boxLabel.style = `margin-left: 8px; margin-top: 2px; margin-right: 2px; color: ${textColor};`
    }

    setIcon(icon) {
        this.icon = icon

        this.child.remove_all_children()
        this.child.add(this.icon)
        this.child.add(this.boxLabel)
    }
}

export class IconButton extends St.Button {
    static {
        GObject.registerClass(this)
    }

    constructor({ iconName, iconSize = null, callback }) {
        super({ style_class: 'button github-actions-icon-button' })

        this.connect('clicked', callback)
        this.set_can_focus(true)
        this.set_child(new St.Icon({ style_class: 'popup-menu-icon', iconName, icon_size: iconSize }))
    }

    setIcon(icon) {
        this.child.set_icon_name(icon)
    }
}

/// Parent item
export class ExpandedMenuItem extends PopupMenu.PopupSubMenuMenuItem {
    static {
        GObject.registerClass(this)
    }

    constructor(startIconName, text, endIconName, endIconCallback) {
        super('')

        this.menuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' })
        this.scrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true })
        this.scrollView.add_actor(this.menuBox)
        this.menu.box.add_actor(this.scrollView)

        this.label = new St.Label({ text: text })
        this.insert_child_at_index(this.label, 0)

        this.setStartIcon({ iconName: startIconName })

        if (endIconName != null) {
            const endIcon = new IconButton({
                iconName: endIconName,
                callback: () => endIconCallback(),
            })

            const box = new St.BoxLayout({
                style_class: 'github-actions-top-box',
                vertical: false,
                x_expand: true,
                y_expand: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
            })
            box.add(endIcon)
            this.insert_child_at_index(box, 5)
        }
    }

    submitItems(items) {
        this.menuBox.remove_all_children()

        items.forEach((i) => {
            this.menuBox.add_actor(
                new IconPopupMenuItem({
                    text: i['text'],
                    startIconName: i['iconName'],
                    itemCallback: i['callback'],
                    endIconName: i["endIconName"],
                    endIconCallback: i["endIconCallback"],
                    endButtonText: i["endButtonText"],
                    endButtonCallback: i["endButtonCallback"],
                }),
            )
        })
    }

    setHeaderItemText(text) {
        this.label.text = text
    }

    setStartIcon({ iconName }) {
        this.icon = new St.Icon({ icon_name: iconName, style_class: 'popup-menu-icon' })

        const iconContainer = new St.Widget({ style_class: 'popup-menu-icon-container' })
        if (this.iconContainer == null) {
            this.iconContainer = iconContainer
            this.insert_child_at_index(this.iconContainer, 0)
        }

        this.iconContainer.remove_all_children()
        this.iconContainer.add_child(this.icon)
    }
}

/// Child item
export class IconPopupMenuItem extends PopupMenu.PopupImageMenuItem {
    static {
        GObject.registerClass(this)
    }

    constructor({
        text = '',
        startIconName,
        itemCallback = () => { },
        endIconName,
        endIconCallback,
        endButtonText,
        endButtonCallback,
    }) {
        super(text, startIconName)

        this.connect('activate', () => itemCallback())

        if (endIconName != null || endButtonText != null) {
            const box = this.createEndAlignBox()
            this.insert_child_at_index(box, 100)

            if (endButtonText != null) {
                const button = new St.Button({ style_class: 'button github-actions-text-button', label: endButtonText })
                button.connect('clicked', endButtonCallback)
                box.add(button)
            }

            if (endIconName != null) {
                const icon = new IconButton({
                    iconName: endIconName,
                    iconSize: 14,
                    callback: () => endIconCallback()
                })

                box.add(icon)
            }
        }
    }

    createEndAlignBox() {
        return new St.BoxLayout({
            style_class: 'github-actions-popup-box',
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        })
    }
}

export function showNotification(message, success) {
    const source = new MessageTray.Source(
        'Github Actions',
        success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic',
    )

    Main.messageTray.add(source)

    const notification = new MessageTray.Notification(
        source,
        success === true ? 'Success!' : 'Error',
        message,
        { gicon: appIcon() },
    )

    source.showNotification(notification)

    const file = Gio.File.new_for_path(
        success === true
            ? '/usr/share/sounds/freedesktop/stereo/complete.oga'
            : '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga'
    )

    const player = global.display.get_sound_player()
    player.play_from_file(file, '', null)
}

export function showConfirmDialog({
    title,
    description,
    itemTitle,
    itemDescription,
    iconName,
    onConfirm
}) {
    let dialog = new ModalDialog.ModalDialog({ destroyOnClose: false })
    let reminderId = null
    let closedId = dialog.connect('closed', (_dialog) => {
        if (!reminderId) {
            reminderId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60,
                () => {
                    dialog.open(global.get_current_time())
                    reminderId = null
                    return GLib.SOURCE_REMOVE
                },
            )
        }
    })

    dialog.connect('destroy', (_actor) => {
        if (closedId) {
            dialog.disconnect(closedId)
            closedId = null
        }

        if (reminderId) {
            GLib.Source.remove(id)
            reminderId = null
        }

        dialog = null
    })

    const content = new Dialog.MessageDialogContent({
        title: title,
        description: description,
    })
    dialog.contentLayout.add_child(content)

    const item = new Dialog.ListSectionItem({
        icon_actor: new St.Icon({ icon_name: iconName }),
        title: itemTitle,
        description: itemDescription,
    })
    content.add_child(item)

    dialog.setButtons([
        {
            label: 'Cancel',
            action: () => dialog.destroy()
        },
        {
            label: 'Confirm',
            action: () => {
                dialog.close(global.get_current_time())
                onConfirm()
            }
        },
    ])

    dialog.open()
}