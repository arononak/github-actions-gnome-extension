'use strict';

const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;

var AppIconColor = {
    WHITE: 1,
    BLACK: 2,
    GRAY: 3,
    GREEN: 4,
    BLUE: 5,
    RED: 6,
}

function createAppGioIcon(appIconType) {
    switch (appIconType) {
        case AppIconColor.WHITE:
            return Gio.icon_new_for_string(`${Me.path}/assets/github_white.svg`);
        case AppIconColor.BLACK:
            return Gio.icon_new_for_string(`${Me.path}/assets/github_black.svg`);
        case AppIconColor.GRAY:
            return Gio.icon_new_for_string(`${Me.path}/assets/github_gray.svg`);
        case AppIconColor.GREEN:
            return Gio.icon_new_for_string(`${Me.path}/assets/github_green.svg`);
        case AppIconColor.BLUE:
            return Gio.icon_new_for_string(`${Me.path}/assets/github_blue.svg`);
        case AppIconColor.RED:
            return Gio.icon_new_for_string(`${Me.path}/assets/github_red.svg`);
    }
}

function appIcon() {
    const darkTheme = utils.isDarkTheme();

    return darkTheme
        ? createAppGioIcon(AppIconColor.WHITE)
        : createAppGioIcon(AppIconColor.BLACK);
}

function showFinishNotification(ownerAndRepo, success) {
    const description = ownerAndRepo + (success === true ? ' - The workflow has been successfully built' : ' - Failed :/');
    showNotification(description, success);
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

        this.setStartIcon({ iconName: startIconName });

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

    setStartIcon({ iconName }) {
        this.icon = new St.Icon({ icon_name: iconName, style_class: 'popup-menu-icon' });

        const iconContainer = new St.Widget({ style_class: 'popup-menu-icon-container' });
        if (this.iconContainer == null) {
            this.iconContainer = iconContainer;
            this.insert_child_at_index(this.iconContainer, 0);
        }

        this.iconContainer.remove_all_children();
        this.iconContainer.add_child(this.icon);
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

function showNotification(message, success) {
    const MessageTray = imports.ui.messageTray;
    const Main = imports.ui.main;

    const source = new MessageTray.Source('Github Actions', success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic');
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification(source, success === true ? 'Success!' : 'Error', message, { gicon: appIcon() });
    source.showNotification(notification);

    const file = Gio.File.new_for_path(
        success === true
            ? '/usr/share/sounds/freedesktop/stereo/complete.oga'
            : '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga'
    );

    const player = global.display.get_sound_player();
    player.play_from_file(file, '', null);
}

function showConfirmDialog({
    title,
    description,
    itemTitle,
    itemDescription,
    iconName,
    onConfirm
}) {
    const Dialog = imports.ui.dialog;
    const ModalDialog = imports.ui.modalDialog;
    const { St } = imports.gi;

    let dialog = new ModalDialog.ModalDialog({ destroyOnClose: false });
    let reminderId = null;
    let closedId = dialog.connect('closed', (_dialog) => {
        if (!reminderId) {
            reminderId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60,
                () => {
                    dialog.open(global.get_current_time());
                    reminderId = null;
                    return GLib.SOURCE_REMOVE;
                },
            );
        }
    });

    dialog.connect('destroy', (_actor) => {
        if (closedId) {
            dialog.disconnect(closedId);
            closedId = null;
        }

        if (reminderId) {
            GLib.Source.remove(id);
            reminderId = null;
        }

        dialog = null;
    });

    const content = new Dialog.MessageDialogContent({
        title: title,
        description: description,
    });
    dialog.contentLayout.add_child(content);

    const item = new Dialog.ListSectionItem({
        icon_actor: new St.Icon({ icon_name: iconName }),
        title: itemTitle,
        description: itemDescription,
    });
    content.add_child(item);

    dialog.setButtons([
        {
            label: 'Cancel',
            action: () => dialog.destroy()
        },
        {
            label: 'Confirm',
            action: () => {
                dialog.close(global.get_current_time());
                onConfirm();
            }
        },
    ]);

    dialog.open();
}