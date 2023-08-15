'use strict';

const { Gio, GObject } = imports.gi;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;
const ExtensionUtils = imports.misc.extensionUtils;
const extension = ExtensionUtils.getCurrentExtension();
const { appIcon } = extension.imports.app.widgets;

var EnabledToggle = class extends QuickSettings.QuickToggle {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init({
            title: 'Github Actions',
            toggleMode: true,
        });
        this.label = 'Github Actions';
        this.gicon = appIcon();

        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');

        this.settings.bind(
            'extension-enabled',
            this,
            'checked',
            Gio.SettingsBindFlags.DEFAULT,
        );
    }
}

var EnabledIndicator = class extends QuickSettings.SystemIndicator {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init();

        this.quickSettingsItems.push(new EnabledToggle());
        this.connect('destroy', () => {
            this.quickSettingsItems.forEach(item => item.destroy());
        });

        QuickSettingsMenu._indicators.add_child(this);
        QuickSettingsMenu._addItems(this.quickSettingsItems);
    }
}