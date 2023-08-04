'use strict';

const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const extension = imports.misc.extensionUtils.getCurrentExtension();

var AppStatusColor = {
    WHITE: {
        icon: `${extension.path}/assets/github_white.svg`,
        innerIcon: `${extension.path}/assets/github_white.svg`,
        innerIconDark: `${extension.path}/assets/github_black.svg`,
        color: '#FFFFFF',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#F0F0F0',
        borderColor: '#F0F0F0',
        backgroundColorDark: '#F0F0F0',
        borderColorDark: '#F0F0F0',
    },
    BLACK: {
        icon: `${extension.path}/assets/github_black.svg`,
        innerIcon: `${extension.path}/assets/github_black.svg`,
        innerIconDark: `${extension.path}/assets/github_white.svg`,
        color: '#555555',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#999999',
        borderColor: '#F0F0F0',
        backgroundColorDark: '#999999',
        borderColorDark: '#F0F0F0',
    },
    GRAY: {
        icon: `${extension.path}/assets/github_gray.svg`,
        innerIcon: `${extension.path}/assets/github_black.svg`,
        innerIconDark: `${extension.path}/assets/github_white.svg`,
        color: '#757575',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#9E9E9E',
        borderColor: '#9E9E9E',
        backgroundColorDark: '#9E9E9E',
        borderColorDark: '#9E9E9E',
    },
    GREEN: {
        icon: `${extension.path}/assets/github_green.svg`,
        innerIcon: `${extension.path}/assets/github_black.svg`,
        innerIconDark: `${extension.path}/assets/github_white.svg`,
        color: '#00FF66',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#60D37A',
        borderColor: '#2F883A',
        backgroundColorDark: '#43A047',
        borderColorDark: '#2E7D32',
    },
    BLUE: {
        icon: `${extension.path}/assets/github_blue.svg`,
        innerIcon: `${extension.path}/assets/github_black.svg`,
        innerIconDark: `${extension.path}/assets/github_white.svg`,
        color: '#64B5F6',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#64B5F6',
        borderColor: '#1565C0',
        backgroundColorDark: '#2196F3',
        borderColorDark: '#0D47A1',
    },
    RED: {
        icon: `${extension.path}/assets/github_red.svg`,
        innerIcon: `${extension.path}/assets/github_black.svg`,
        innerIconDark: `${extension.path}/assets/github_white.svg`,
        color: '#EF5350',
        textColor: '#555555',
        textColorDark: '#FFFFFF',
        backgroundColor: '#EF6C57',
        borderColor: '#E57364',
        backgroundColorDark: '#E53935',
        borderColorDark: '#C62828',
    },
}

function createAppGioIcon(appStatusColor) {
    return Gio.icon_new_for_string(appStatusColor.icon);
}

function createAppGioIconInner(appStatusColor) {
    const darkTheme = isDarkTheme();

    return darkTheme
        ? Gio.icon_new_for_string(appStatusColor.innerIconDark)
        : Gio.icon_new_for_string(appStatusColor.innerIcon);
}

function conclusionIconName(conclusion) {
    if (conclusion == 'success') {
        return 'emblem-default';
    } else if (conclusion == 'failure') {
        return 'emblem-unreadable';
    } else {
        return 'emblem-synchronizing-symbolic';
    }
}

function isDarkTheme() {
    const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
    const theme = settings.get_string('gtk-theme');

    return theme.replace(/'/g, "").trim().includes("dark");
}

function appIcon() {
    const darkTheme = isDarkTheme();

    return darkTheme
        ? createAppGioIcon(AppStatusColor.WHITE)
        : createAppGioIcon(AppStatusColor.BLACK);
}

var RoundedButton = class extends St.Button {
    static {
        GObject.registerClass(this);
    }

    constructor({ icon, iconName }) {
        super({ style_class: 'button github-actions-button-action' });

        if (icon != null) {
            this.child = icon;
        }

        if (iconName != null) {
            this.child = new St.Icon({ icon_name: iconName });
        }
    }
};

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

/// Parent item
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
            );
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

/// Child item
var IconPopupMenuItem = class extends PopupMenu.PopupImageMenuItem {
    static {
        GObject.registerClass(this);
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
        super(text, startIconName);

        this.connect('activate', () => itemCallback());

        if (endIconName != null) {
            const icon = new IconButton(endIconName, () => endIconCallback());

            const box = this.createEndAlignBox();
            this.insert_child_at_index(box, 100);
            box.add(icon);

            return;
        }

        if (endButtonText != null) {
            const button = new St.Button({ label: endButtonText });
            button.connect('clicked', endButtonCallback);

            const box = this.createEndAlignBox();
            this.insert_child_at_index(box, 100);
            box.add(button);

            return;
        }
    }

    createEndAlignBox() {
        return new St.BoxLayout({
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
    }
}

function showNotification(message, success) {
    const MessageTray = imports.ui.messageTray;
    const Main = imports.ui.main;

    const source = new MessageTray.Source(
        'Github Actions',
        success === true ? 'emoji-symbols-symbolic' : 'window-close-symbolic',
    );

    Main.messageTray.add(source);

    const notification = new MessageTray.Notification(
        source,
        success === true ? 'Success!' : 'Error',
        message,
        { gicon: appIcon() },
    );

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