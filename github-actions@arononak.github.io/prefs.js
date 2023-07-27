'use strict';

const { Adw, Gio, Gtk, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const extension = imports.misc.extensionUtils.getCurrentExtension();
const { PrefsDataController } = extension.imports.app.prefs_data_controller;

function init() { }

function createEntityRow({ title, text, onChanged }) {
    const entry = new Gtk.Entry({
        buffer: new Gtk.EntryBuffer({ text: text }),
        hexpand: true,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
    });
    entry.set_size_request(300, -1);
    entry.connect('changed', (widget) => {
        const text = entry.get_buffer().text;

        if (text) {
            onChanged(text);
        }
    });

    const row = new Adw.ActionRow({ title: title });
    row.add_suffix(entry);
    row.activatable_widget = entry;

    return row;
}

function createSpinButtonRow({ title, subtitle, value, lower, upper, onSpinButtonCreated }) {
    const spinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    spinButton.wrap = true;
    spinButton.width_chars = 2;
    spinButton.margin_top = 8;
    spinButton.margin_bottom = 8;
    spinButton.adjustment = new Gtk.Adjustment({
        value: value,
        lower: lower,
        upper: upper,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });

    onSpinButtonCreated(spinButton);

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    });

    row.add_suffix(spinButton);
    row.activatable_widget = spinButton;

    return row;
}

function createToggleRow({ title, subtitle, value, onSwitchButtonCreated }) {
    const switchButton = new Gtk.Switch({ active: value, valign: Gtk.Align.CENTER });
    onSwitchButtonCreated(switchButton);

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    });
    row.add_suffix(switchButton);
    row.activatable_widget = switchButton;

    return row;
}

function fillPreferencesWindow(window) {
    window.set_default_size(550, 870);
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');
    const prefsDataController = new PrefsDataController(settings);

    const {
        owner,
        repo,
        refreshTime,
        coldRefreshTime,
        packageSize,
        coldPackageSize,
        pagination,

        simpleMode,
        coloredMode,
        uppercaseMode,

        version,
    } = prefsDataController.fetchData();

    /// Repository
    const ownerRow = createEntityRow({
        title: 'Owner',
        text: owner,
        onChanged: (text) => prefsDataController.updateOwner(text),
    });

    const repoRow = createEntityRow({
        title: 'Repo',
        text: repo,
        onChanged: (text) => prefsDataController.updateRepo(text),
    });

    /// Appearance
    const simpleModeRow = createToggleRow({
        title: 'Simple mode',
        subtitle: 'Mode for minimalists containing the most important functionalities',
        value: simpleMode,
        onSwitchButtonCreated: (switchButton) => settings.bind('simple-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
    });

    const coloredModeRow = createToggleRow({
        title: 'Colored mode',
        subtitle: 'Colored mode for colorblind, aesthetes and gay people',
        value: coloredMode,
        onSwitchButtonCreated: (switchButton) => settings.bind('colored-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
    });

    const uppercaseModeRow = createToggleRow({
        title: 'UpperCase mode',
        value: uppercaseMode,
        onSwitchButtonCreated: (switchButton) => settings.bind('uppercase-mode', switchButton, 'active', Gio.SettingsBindFlags.DEFAULT),
    });

    const appearanceGroup = new Adw.PreferencesGroup({ title: 'Appearance' });
    appearanceGroup.add(simpleModeRow);
    appearanceGroup.add(coloredModeRow);
    appearanceGroup.add(uppercaseModeRow);

    /// Refresh
    const refreshStatusRow = createSpinButtonRow({
        title: 'Github Actions (in seconds)',
        subtitle: `Package size: ${packageSize}`,
        value: refreshTime,
        lower: 1,
        upper: 60,
        onSpinButtonCreated: (spinButton) => settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
    });

    const fullRefreshRow = createSpinButtonRow({
        title: 'Data (in minutes)',
        subtitle: `Package size: ${coldPackageSize}`,
        value: coldRefreshTime,
        lower: 1,
        upper: 60,
        onSpinButtonCreated: (spinButton) => settings.bind('full-refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
    });

    const paginationRow = createSpinButtonRow({
        title: 'Pagination:',
        value: pagination,
        lower: 1,
        upper: 100,
        onSpinButtonCreated: (spinButton) => settings.bind('pagination', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT),
    });

    const generalGroup = new Adw.PreferencesGroup({ title: 'Watched repository' });
    generalGroup.add(ownerRow);
    generalGroup.add(repoRow);

    const refreshStatusGroup = new Adw.PreferencesGroup({ title: 'Refresh settings' });
    refreshStatusGroup.add(refreshStatusRow);
    refreshStatusGroup.add(fullRefreshRow);
    refreshStatusGroup.add(paginationRow);

    const githubButton = new Gtk.Button({ label: 'Give me a star!' });
    githubButton.connect('clicked', () => prefsDataController.onStarClicked());
    githubButton.margin_top = 8;
    githubButton.margin_bottom = 8;
    
    const starRow = new Adw.ActionRow({ title: 'You love this extension ?' });
    starRow.add_suffix(githubButton);

    const versionRow = new Adw.ActionRow({ title: 'Version:' });
    versionRow.add_suffix(new Gtk.Label({ label: version, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const otherGroup = new Adw.PreferencesGroup({ title: 'Other' });
    otherGroup.add(starRow);
    otherGroup.add(versionRow);

    const page = new Adw.PreferencesPage();
    page.add(generalGroup);
    page.add(appearanceGroup);
    page.add(refreshStatusGroup);
    page.add(otherGroup);

    window.add(page);
}
