'use strict';

const { Adw, Gio, Gtk, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;     // utils.js
const version = Me.imports.version; // version.js

function init() { }

function fillPreferencesWindow(window) {
    window.set_default_size(500, 700);
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');

    const ownerEntry = new Gtk.Entry({ buffer: new Gtk.EntryBuffer({ text: settings.get_string('owner') }), hexpand: true, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER });
    ownerEntry.set_halign(Gtk.Align.END);
    const ownerRow = new Adw.ActionRow({ title: 'Owner' });
    ownerRow.add_suffix(ownerEntry);
    ownerRow.activatable_widget = ownerEntry;
    ownerEntry.connect('changed', (widget) => {
        if (ownerEntry.get_buffer().text) {
            settings.set_string('owner', ownerEntry.get_buffer().text);
        }
    });

    const repoEntry = new Gtk.Entry({ buffer: new Gtk.EntryBuffer({ text: settings.get_string('repo') }), hexpand: true, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER });
    repoEntry.set_halign(Gtk.Align.END);
    const repoRow = new Adw.ActionRow({ title: 'Repo' });
    repoRow.add_suffix(repoEntry);
    repoRow.activatable_widget = repoEntry;
    repoEntry.connect('changed', (widget) => {
        if (repoEntry.get_buffer().text) {
            settings.set_string('repo', repoEntry.get_buffer().text);
        }
    });

    const refreshStatusSpinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    refreshStatusSpinButton.wrap = true;
    refreshStatusSpinButton.width_chars = 2;
    refreshStatusSpinButton.margin_top = 8;
    refreshStatusSpinButton.margin_bottom = 8;
    refreshStatusSpinButton.adjustment = new Gtk.Adjustment({
        value: utils.prefsRefreshTime(settings),
        lower: 1,
        upper: 60,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });
    const refreshStatusRow = new Adw.ActionRow();
    refreshStatusRow.add_prefix(new Gtk.Label({ label: 'Refresh status time in s.' }));
    refreshStatusRow.add_suffix(refreshStatusSpinButton);
    refreshStatusRow.activatable_widget = refreshStatusSpinButton;
    settings.bind('refresh-time', refreshStatusSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const dataRow = new Adw.ActionRow({ title: 'Data package size ' });
    dataRow.add_suffix(new Gtk.Label({ label: utils.prefsPackageSize(settings), halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const fullRefreshSpinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    fullRefreshSpinButton.wrap = true;
    fullRefreshSpinButton.width_chars = 2;
    fullRefreshSpinButton.margin_top = 8;
    fullRefreshSpinButton.margin_bottom = 8;
    fullRefreshSpinButton.adjustment = new Gtk.Adjustment({
        value: utils.prefsRefreshTime(settings),
        lower: 1,
        upper: 60,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });
    const fullRefreshRow = new Adw.ActionRow();
    fullRefreshRow.add_prefix(new Gtk.Label({ label: 'Full refresh time in m.' }));
    fullRefreshRow.add_suffix(fullRefreshSpinButton);
    fullRefreshRow.activatable_widget = fullRefreshSpinButton;
    settings.bind('full-refresh-time', fullRefreshSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const fullDataRow = new Adw.ActionRow({ title: 'Full data package size ' });
    fullDataRow.add_suffix(new Gtk.Label({ label: utils.prefsColdPackageSize(settings), halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const versionRow = new Adw.ActionRow();
    versionRow.add_prefix(new Gtk.Label({ label: 'Version: ', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));
    versionRow.add_suffix(new Gtk.Label({ label: version.VERSION, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const githubButton = new Gtk.Button({ label: 'Give me a star!' });
    githubButton.connect('clicked', () => utils.openUrl('https://github.com/arononak/github-actions-gnome-extension'));
    githubButton.margin_top = 8;
    githubButton.margin_bottom = 8;
    const starRow = new Adw.ActionRow({ title: 'You love this extension ?' });
    starRow.add_suffix(githubButton);

    const generalGroup = new Adw.PreferencesGroup({ title: 'General' });
    generalGroup.add(ownerRow);
    generalGroup.add(repoRow);

    const refreshStatusGroup = new Adw.PreferencesGroup({ title: 'Refresh status' });
    refreshStatusGroup.add(dataRow);
    refreshStatusGroup.add(refreshStatusRow);
    refreshStatusGroup.add(fullDataRow);
    refreshStatusGroup.add(fullRefreshRow);

    const otherGroup = new Adw.PreferencesGroup({ title: 'Other' });
    otherGroup.add(starRow);
    otherGroup.add(versionRow);

    const page = new Adw.PreferencesPage();
    page.add(generalGroup);
    page.add(refreshStatusGroup);
    page.add(otherGroup);

    window.add(page);
}
