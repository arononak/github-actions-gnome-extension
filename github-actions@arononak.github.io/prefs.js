'use strict';

const { Adw, Gio, Gtk, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

const extension = imports.misc.extensionUtils.getCurrentExtension();
const { openUrl } = extension.imports.app.utils;
const { VERSION } = extension.imports.app.version;

function init() { }

function fillPreferencesWindow(window) {
    window.set_default_size(550, 870);
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');
    const settingsRepository = new SettingsRepository(settings);

    /// Repository
    const ownerEntry = new Gtk.Entry({
        buffer: new Gtk.EntryBuffer({ text: settingsRepository.fetchOwner(settings) }),
        hexpand: true,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
    });
    ownerEntry.set_halign(Gtk.Align.END);
    ownerEntry.set_size_request(300, -1);
    const ownerRow = new Adw.ActionRow({ title: 'Owner' });
    ownerRow.add_suffix(ownerEntry);
    ownerRow.activatable_widget = ownerEntry;
    ownerEntry.connect('changed', (widget) => {
        const owner = ownerEntry.get_buffer().text;

        if (owner) {
            settingsRepository.updateOwner(owner);
        }
    });

    const repoEntry = new Gtk.Entry({
        buffer: new Gtk.EntryBuffer({ text: settingsRepository.fetchRepo() }),
        hexpand: true,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
    });
    repoEntry.set_halign(Gtk.Align.END);
    repoEntry.set_size_request(300, -1);
    const repoRow = new Adw.ActionRow({ title: 'Repo' });
    repoRow.add_suffix(repoEntry);
    repoRow.activatable_widget = repoEntry;
    repoEntry.connect('changed', (widget) => {
        const repo = repoEntry.get_buffer().text;

        if (repo) {
            settingsRepository.updateRepo(repo);
        }
    });

    /// Refresh
    const refreshStatusSpinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    refreshStatusSpinButton.wrap = true;
    refreshStatusSpinButton.width_chars = 2;
    refreshStatusSpinButton.margin_top = 8;
    refreshStatusSpinButton.margin_bottom = 8;
    refreshStatusSpinButton.adjustment = new Gtk.Adjustment({
        value: settingsRepository.fetchRefreshTime(),
        lower: 1,
        upper: 60,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });
    const refreshStatusRow = new Adw.ActionRow({
        title: 'Github Actions (in seconds)',
        subtitle: `Package size: ${settingsRepository.fetchPackageSize()}`,
    });
    refreshStatusRow.add_suffix(refreshStatusSpinButton);
    refreshStatusRow.activatable_widget = refreshStatusSpinButton;
    settings.bind('refresh-time', refreshStatusSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const fullRefreshSpinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    fullRefreshSpinButton.wrap = true;
    fullRefreshSpinButton.width_chars = 2;
    fullRefreshSpinButton.margin_top = 8;
    fullRefreshSpinButton.margin_bottom = 8;
    fullRefreshSpinButton.adjustment = new Gtk.Adjustment({
        value: fetchRefreshTime(settings),
        lower: 1,
        upper: 60,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });

    const fullRefreshRow = new Adw.ActionRow({
        title: 'Data (in minutes)',
        subtitle: `Package size: ${settingsRepository.fetchColdPackageSize()}`,
    });
    fullRefreshRow.add_suffix(fullRefreshSpinButton);
    fullRefreshRow.activatable_widget = fullRefreshSpinButton;
    settings.bind('full-refresh-time', fullRefreshSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const paginationSpinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    paginationSpinButton.wrap = true;
    paginationSpinButton.width_chars = 2;
    paginationSpinButton.margin_top = 8;
    paginationSpinButton.margin_bottom = 8;
    paginationSpinButton.adjustment = new Gtk.Adjustment({
        value: fetchPagination(settings),
        lower: 1,
        upper: 100,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });
    const paginationRow = new Adw.ActionRow({ title: 'Pagination:' });
    paginationRow.add_suffix(paginationSpinButton);
    paginationRow.activatable_widget = paginationSpinButton;
    settings.bind('pagination', paginationSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const versionRow = new Adw.ActionRow({ title: 'Version:' });
    versionRow.add_suffix(new Gtk.Label({ label: VERSION, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const starRow = new Adw.ActionRow({ title: 'You love this extension ?' });
    const githubButton = new Gtk.Button({ label: 'Give me a star!' });
    githubButton.connect('clicked', () => openUrl('https://github.com/arononak/github-actions-gnome-extension'));
    githubButton.margin_top = 8;
    githubButton.margin_bottom = 8;
    starRow.add_suffix(githubButton);

    const generalGroup = new Adw.PreferencesGroup({ title: 'Watched repository' });
    generalGroup.add(ownerRow);
    generalGroup.add(repoRow);

    const refreshStatusGroup = new Adw.PreferencesGroup({ title: 'Refresh settings' });
    refreshStatusGroup.add(refreshStatusRow);
    refreshStatusGroup.add(fullRefreshRow);
    refreshStatusGroup.add(paginationRow);

    /// Appearance
    const simpleModeSwitch = new Gtk.Switch({ active: settingsRepository.fetchSimpleMode(), valign: Gtk.Align.CENTER });
    settings.bind('simple-mode', simpleModeSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    const simpleModeRow = new Adw.ActionRow({
        title: 'Simple mode',
        subtitle: 'Mode for minimalists containing the most important functionalities',
    });
    simpleModeRow.add_suffix(simpleModeSwitch);
    simpleModeRow.activatable_widget = simpleModeSwitch;

    const coloredModeSwitch = new Gtk.Switch({ active: settingsRepository.fetchColoredMode(), valign: Gtk.Align.CENTER });
    settings.bind('colored-mode', coloredModeSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    const coloredModeRow = new Adw.ActionRow({
        title: 'Colored mode',
        subtitle: 'Colored mode for colorblind, aesthetes and gay people',
    });
    coloredModeRow.add_suffix(coloredModeSwitch);
    coloredModeRow.activatable_widget = coloredModeSwitch;

    const uppercaseModeSwitch = new Gtk.Switch({ active: settingsRepository.fetchUppercaseMode(), valign: Gtk.Align.CENTER });
    settings.bind('uppercase-mode', uppercaseModeSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    const uppercaseModeRow = new Adw.ActionRow({
        title: 'UpperCase mode',
    });
    uppercaseModeRow.add_suffix(uppercaseModeSwitch);
    uppercaseModeRow.activatable_widget = uppercaseModeSwitch;

    const appearanceGroup = new Adw.PreferencesGroup({ title: 'Appearance' });
    appearanceGroup.add(simpleModeRow);
    appearanceGroup.add(coloredModeRow);
    appearanceGroup.add(uppercaseModeRow);

    /// Other
    const otherGroup = new Adw.PreferencesGroup({ title: 'Other' });
    otherGroup.add(starRow);
    otherGroup.add(versionRow);

    /// Page
    const page = new Adw.PreferencesPage();
    page.add(generalGroup);
    page.add(appearanceGroup);
    page.add(refreshStatusGroup);
    page.add(otherGroup);

    window.add(page);
}
