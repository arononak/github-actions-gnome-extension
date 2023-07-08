'use strict';

const { Clutter, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;

function showFinishNotification(ownerAndRepo, success) {
    const description = ownerAndRepo + (success === true ? ' - Succeeded' : ' - Failed :/');
    utils.showNotification(description, success);
}

function createPopupImageMenuItem(text, startIconName, itemCallback, endIconName, endIconCallback) {
    const item = new PopupMenu.PopupImageMenuItem(text, startIconName);
    item.connect('activate', () => itemCallback());

    if (endIconName != null) {
        const icon = new IconButton(endIconName, () => endIconCallback())
        const box = new St.BoxLayout({
            style_class: 'github-actions-top-box',
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add(icon);
        item.insert_child_at_index(box, 100);
    }

    return item;
}

function createRoundButton({ icon, iconName }) {
    const button = new St.Button({ style_class: 'button github-actions-button-action' });
    if (icon != null) {
        button.child = icon;
    }
    if (iconName != null) {
        button.child = new St.Icon({ icon_name: iconName });
    }
    return button;
}

var ExpandedMenuItem = class extends PopupMenu.PopupSubMenuMenuItem {
    static {
        GObject.registerClass(this);
    }

    constructor(startIconName, text, endIconName, endIconCallback) {
        super('');

        this.menuBox = new St.BoxLayout({ vertical: true, style_class: 'menu-box' });
        this.scrollView = new St.ScrollView({ y_align: Clutter.ActorAlign.START, y_expand: true, overlay_scrollbars: true });
        this.scrollView.add_actor(this.menuBox);
        this.menu.box.add_actor(this.scrollView);

        this.label = new St.Label({ text: text });
        this.insert_child_at_index(this.label, 0);

        this.iconContainer = new St.Widget({ style_class: 'popup-menu-icon-container' });
        this.insert_child_at_index(this.iconContainer, 0);
        this.icon = new St.Icon({ icon_name: startIconName, style_class: 'popup-menu-icon' });
        this.iconContainer.add_child(this.icon);

        if (endIconName != null) {
            const endIcon = new IconButton(endIconName, () => endIconCallback())
            const box = new St.BoxLayout({
                style_class: 'github-actions-top-box',
                vertical: false,
                x_expand: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
            });
            box.add(endIcon);
            this.insert_child_at_index(box, 5);
        }
    }

    submitItems(items) {
        this.menuBox.remove_all_children();

        items.forEach((i) => {
            this.menuBox.add_actor(createPopupImageMenuItem(i['text'], i['iconName'], i['callback'], i["endIconName"], i["endIconCallback"]));
        });
    }

    setHeaderItemText(text) {
        this.label.text = text;
    }
}

var IconButton = class extends St.Button {
    static {
        GObject.registerClass(this);
    }

    constructor(iconName, callback) {
        super();
        this.connect('clicked', callback);
        this.set_can_focus(true);
        this.set_child(new St.Icon({ style_class: 'popup-menu-icon', iconName }));
    }

    setIcon(icon) {
        this.child.set_icon_name(icon);
    }
};
