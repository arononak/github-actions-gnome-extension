'use strict'

/* for 'global'c */
/* eslint-disable no-undef */

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
    isGnome45,
} from './extension_utils.js'

const colors = {
    "bark": `#787859`,
    "blue": `#0073E5`,
    "magenta": `#B34CB3`,
    "olive": `#4B8501`,
    "prussiangreen": `#308280`,
    "purple": `#7764D8`,
    "red": `#DA3450`,
    "sage": `#657B69`,
    "viridian": `#03875B`,
    "default": `#E95420`
};

export const AppStatusColor = {
    WHITE: {
        icon: `/assets/github_white.svg`,
        innerIcon: `/assets/github_white.svg`,
        innerIconDark: `/assets/github_black.svg`,
        color: `#FFFFFF`,
        textColor: `#555555`,
        backgroundColor: `#F0F0F0`,
        borderColor: `#F0F0F0`,
    },
    BLACK: {
        icon: `/assets/github_black.svg`,
        innerIcon: `/assets/github_black.svg`,
        innerIconDark: `/assets/github_white.svg`,
        color: `#555555`,
        textColor: `#555555`,
        backgroundColor: `#999999`,
        borderColor: `#F0F0F0`,
    },
    GRAY: {
        icon: `/assets/github_white.svg`,
        innerIcon: `/assets/github_black.svg`,
        innerIconDark: `/assets/github_white.svg`,
        color: `#757575`,
        textColor: `#FFFFFF`,
        backgroundColor: `#757575`,
        borderColor: `#757575`,
    },
    GREEN: {
        icon: `/assets/github_white.svg`,
        innerIcon: `/assets/github_black.svg`,
        innerIconDark: `/assets/github_white.svg`,
        color: `#55FF55`,
        textColor: `#FFFFFF`,
        backgroundColor: `#339933`,
        borderColor: `#339933`,
    },
    BLUE: {
        icon: `/assets/github_white.svg`,
        innerIcon: `/assets/github_black.svg`,
        innerIconDark: `/assets/github_white.svg`,
        color: colors[`blue`],
        textColor: `#FFFFFF`,
        backgroundColor: colors[`blue`],
        borderColor: colors[`blue`],
    },
    RED: {
        icon: `/assets/github_white.svg`,
        innerIcon: `/assets/github_black.svg`,
        innerIconDark: `/assets/github_white.svg`,
        color: `#AA0000`,
        textColor: `#FFFFFF`,
        backgroundColor: `#AA0000`,
        borderColor: `#AA0000`,
    },
}

export function createAppGioIcon(appStatusColor) {
    return Gio.icon_new_for_string(extensionPath() + appStatusColor.icon)
}

export function createAppGioIconInner() {
    return Gio.icon_new_for_string(extensionPath() + `/assets/github_white.svg`)
}

export function anvilIcon() {
    const darkTheme = isDarkTheme()

    return darkTheme
        ? Gio.icon_new_for_string(`${extensionPath()}/assets/anvil_white.svg`)
        : Gio.icon_new_for_string(`${extensionPath()}/assets/anvil_black.svg`)
}

export function appIcon() {
    const darkTheme = isDarkTheme()

    return darkTheme
        ? createAppGioIcon(AppStatusColor.WHITE)
        : createAppGioIcon(AppStatusColor.BLACK)
}

export function conclusionIconName(conclusion) {
    if (conclusion == `success`) {
        return `emblem-ok-symbolic`
    } else if (conclusion == `failure`) {
        return `dialog-error-symbolic`
    } else if (conclusion == `cancelled`) {
        return `dialog-error-symbolic`
    } else {
        return `emblem-synchronizing-symbolic`
    }
}

export function isDarkTheme() {
    const settings = new Gio.Settings({ schema: `org.gnome.desktop.interface` })
    const theme = settings.get_string(`gtk-theme`)

    return theme.replace(/'/g, ``).trim().includes(`dark`)
}

export function getAccentColor() {
    const settings = new Gio.Settings({ schema: `org.gnome.desktop.interface` })
    const theme = settings.get_string(`gtk-theme`)

    switch (true) {
        case theme.includes(`bark`):
            return colors[`bark`]
        case theme.includes(`blue`):
            return colors[`blue`]
        case theme.includes(`magenta`):
            return colors[`magenta`]
        case theme.includes(`olive`):
            return colors[`olive`]
        case theme.includes(`prussiangreen`):
            return colors[`prussiangreen`]
        case theme.includes(`purple`):
            return colors[`purple`]
        case theme.includes(`red`):
            return colors[`red`]
        case theme.includes(`sage`):
            return colors[`sage`]
        case theme.includes(`viridian`):
            return colors[`viridian`]
        default:
            return colors[`default`]
    }
}

export class RoundedButton extends St.Button {
    static {
        GObject.registerClass(this)
    }

    constructor({ iconName, text }) {
        super({ style_class: `button github-actions-button-action` })

        this.child = new St.BoxLayout()

        if (iconName != null) {
            this.icon = new St.Icon({ icon_name: iconName, icon_size: 20 })
            if (isGnome45()) {
                this.child.add(this.icon)
            } else {
                this.child.add_child(this.icon)
            }
        }

        if (text != null) {
            // this.label from St.Button is used
            this.boxLabel = new St.Label({ text, y_align: Clutter.ActorAlign.CENTER, y_expand: true })
            if (isGnome45()) {
                this.child.add(this.boxLabel)
            } else {
                this.child.add_child(this.boxLabel)
            }
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
        if (isGnome45()) {
            this.child.add(this.icon)
            this.child.add(this.boxLabel)
        } else {
            this.child.add_child(this.icon)
            this.child.add_child(this.boxLabel)
        }
    }
}

export class IconButton extends St.Button {
    static {
        GObject.registerClass(this)
    }

    constructor({ iconName, iconSize = null, callback }) {
        super({ style_class: `button github-actions-icon-button` })

        this.connect(`clicked`, callback)
        this.set_can_focus(true)
        this.set_child(new St.Icon({ style_class: `popup-menu-icon`, iconName, icon_size: iconSize }))
    }

    setIcon(icon) {
        this.child.set_icon_name(icon)
    }
}

export class ParentMenuItemEmpty extends PopupMenu.PopupBaseMenuItem {
    static {
        GObject.registerClass(this)
    }

    constructor() {
        super({ reactive: false })
        this.remove_all_children() // Remove left margin from non visible PopupMenuItem icon
    }

    addWidget(widget) {
        if (isGnome45()) {
            this.actor.add_actor(widget)
        } else {
            this.actor.add_child(widget)
        }
    }
}

export class ParentMenuItem extends PopupMenu.PopupSubMenuMenuItem {
    static {
        GObject.registerClass(this)
    }

    constructor(startIconName, text, endIconName, endIconCallback, accentColor = false) {
        super(``)

        this.accentColor = accentColor

        this.menuBox = new St.BoxLayout({ vertical: true, style_class: `menu-box` })
        this.scrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true })
        if (isGnome45()) {
            this.scrollView.add_actor(this.menuBox)
            this.menu.box.add_actor(this.scrollView)
        } else {
            this.scrollView.add_child(this.menuBox)
            this.menu.box.add_child(this.scrollView)
        }

        this.label = new St.Label({ text })

        if (accentColor == true) {
            this.style = `background-color: ${getAccentColor()};`
            this.label.style = `margin-left: 4px; color: white;`
            this._triangle.style = `color: white;`
        }

        this.insert_child_at_index(this.label, 0)

        this.setStartIcon({ iconName: startIconName })

        if (endIconName != null) {
            const endIcon = new IconButton({
                iconName: endIconName,
                callback: () => endIconCallback(),
            })

            const box = new St.BoxLayout({
                style_class: `github-actions-top-box`,
                vertical: false,
                x_expand: true,
                y_expand: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
            })
            if (isGnome45()) {
                box.add(endIcon)
            } else {
                box.add_child(endIcon)
            }
            this.insert_child_at_index(box, 5)
        }
    }

    addChild(menuItem) {
        if (isGnome45()) {
            this.menuBox.add_actor(menuItem)
        } else {
            this.menuBox.add_child(menuItem)
        }
    }

    submitItems(items) {
        this.menuBox.remove_all_children()

        items.forEach((i) => {
            const item = new ChildMenuItem({
                text: i[`text`],
                startIconName: i[`iconName`],
                itemCallback: i[`callback`],
                endIconName: i[`endIconName`],
                endIconCallback: i[`endIconCallback`],
                endButtonText: i[`endButtonText`],
                endButtonCallback: i[`endButtonCallback`],
            })

            if (isGnome45()) {
                this.menuBox.add_actor(item)
            } else {
                this.menuBox.add_child(item)
            }
        })
    }

    setHeaderItemText(text) {
        this.label.text = text
    }

    setStartIcon({ iconName }) {
        this.icon = new St.Icon({ icon_name: iconName, style_class: `popup-menu-icon` })

        const iconContainer = new St.Widget({ style_class: `popup-menu-icon-container`, style: this.accentColor == true ? `color: white;` : `` })
        if (this.iconContainer == null) {
            this.iconContainer = iconContainer
            this.insert_child_at_index(this.iconContainer, 0)
        }

        this.iconContainer.remove_all_children()
        this.iconContainer.add_child(this.icon)
    }
}

export class ChildMenuItem extends PopupMenu.PopupImageMenuItem {
    static {
        GObject.registerClass(this)
    }

    constructor({
        text = ``,
        startIconName,
        itemCallback = () => { },
        endIconName,
        endIconCallback,
        endButtonText,
        endButtonCallback,
    }) {
        super(text, startIconName)

        this.connect(`activate`, () => itemCallback())

        if (endIconName != null || endButtonText != null) {
            const box = this.createEndAlignBox()
            this.insert_child_at_index(box, 100)

            if (endButtonText != null) {
                this._endButton = new St.Button({ style_class: `button github-actions-text-button`, label: endButtonText })
                this._endButton.connect(`clicked`, endButtonCallback)
                if (isGnome45()) {
                    box.add(this._endButton)
                } else {
                    box.add_child(this._endButton)
                }
            }

            if (endIconName != null) {
                const icon = new IconButton({
                    iconName: endIconName,
                    iconSize: 14,
                    callback: () => endIconCallback()
                })

                if (isGnome45()) {
                    box.add(icon)
                } else {
                    box.add_child(icon)
                }
            }
        }
    }

    createEndAlignBox() {
        return new St.BoxLayout({
            style_class: `github-actions-popup-box`,
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        })
    }

    updateEndButtonText(newText) {
        if (this._endButton) {
            this._endButton.label = newText;
        }
    }
}

export class Box extends St.BoxLayout {
    static {
        GObject.registerClass(this)
    }

    constructor({ gravityEnd = false }) {
        super({
            style_class: `github-actions-box`,
            x_align: gravityEnd ? Clutter.ActorAlign.END : Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: false,
            x_expand: true,
        })
    }

    addWidget(widget) {
        if (isGnome45()) {
            this.add(widget)
        } else {
            this.add_child(widget)
        }
    }
}

export function showNotification(message, success) {
    const source = isGnome45()
        ? new MessageTray.Source(
            `Github Actions`,
            success === true ? `emoji-symbols-symbolic` : `window-close-symbolic`,
        )
        : new MessageTray.Source({
            title: `Github Actions`,
            icon: new Gio.ThemedIcon({ name: success === true ? `emoji-symbols-symbolic` : `window-close-symbolic` }),
        })

    Main.messageTray.add(source)

    const notification = isGnome45()
        ? new MessageTray.Notification(
            source,
            success === true ? `Success!` : `Error`,
            message,
            { gicon: appIcon() },
        )
        : new MessageTray.Notification({
            source,
            title: success === true ? `Success!` : `Error`,
            body: message,
            gicon: appIcon(),
            urgency: MessageTray.Urgency.NORMAL,
        })

    isGnome45() ? source.showNotification(notification) : source.addNotification(notification)

    const file = Gio.File.new_for_path(
        success === true
            ? `/usr/share/sounds/freedesktop/stereo/dialog-information.oga`
            : `/usr/share/sounds/freedesktop/stereo/dialog-warning.oga`
    )

    const player = global.display.get_sound_player()
    player.play_from_file(file, ``, null)
}

export function showConfirmDialog({
    title,
    description,
    itemTitle,
    itemDescription,
    iconName,
    onConfirm
}) {
    let dialog = new ModalDialog.ModalDialog({ destroyOnClose: true })
    let reminderId = null
    let closedId = dialog.connect(`closed`, () => {
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

    dialog.connect(`destroy`, (_actor) => {
        if (closedId) {
            dialog.disconnect(closedId)
            closedId = null
        }

        if (reminderId) {
            GLib.Source.remove(reminderId)
            reminderId = null
        }

        dialog = null
    })

    const content = new Dialog.MessageDialogContent({ title, description })

    dialog.contentLayout.add_child(content)

    const icon = new St.Icon({ icon_name: iconName })
    icon.style = `margin-right: 8px;`

    const item = new Dialog.ListSectionItem({
        icon_actor: icon,
        title: itemTitle,
        description: itemDescription,
    })

    content.add_child(item)

    dialog.setButtons([
        {
            label: `Cancel`,
            action: () => dialog.destroy()
        },
        {
            label: `Confirm`,
            action: () => {
                dialog.close(global.get_current_time())
                onConfirm()
            }
        },
    ])

    dialog.open()
}
