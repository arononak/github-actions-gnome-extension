'use strict';

const { Adw, Gio, Gtk, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;     // utils.js
const version = Me.imports.version; // version.js

function init() { }

function fillPreferencesWindow(window) {
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

    const spinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 });
    spinButton.wrap = true;
    spinButton.width_chars = 2;
    spinButton.margin_top = 8;
    spinButton.margin_bottom = 8;
    spinButton.adjustment = new Gtk.Adjustment({
        value: utils.prefsRefreshTime(settings),
        lower: 1,
        upper: 60,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });

    const refreshRow = new Adw.ActionRow();
    refreshRow.add_prefix(new Gtk.Label({ label: 'Refresh time in s.' }));
    refreshRow.add_suffix(spinButton);
    refreshRow.activatable_widget = spinButton;
    settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const tipRow = new Adw.ActionRow();
    tipRow.add_prefix(new Gtk.Label({ label: 'Changing the time requires restarting the extension', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const group = new Adw.PreferencesGroup();
    group.add(ownerRow);
    group.add(repoRow);
    group.add(refreshRow);
    group.add(tipRow);

    const dataRow = new Adw.ActionRow({ title: 'Data package size ' });
    dataRow.add_suffix(new Gtk.Label({ label: utils.prefsPackageSize(settings), halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const versionRow = new Adw.ActionRow();
    versionRow.add_prefix(new Gtk.Label({ label: 'Version: ', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));
    versionRow.add_suffix(new Gtk.Label({ label: version.VERSION, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const githubButton = new Gtk.Button({ label: 'Give me a star!' });
    githubButton.connect('clicked', () => utils.openUrl('https://github.com/arononak/github-actions-gnome-extension'));
    githubButton.margin_top = 8;
    githubButton.margin_bottom = 8;
    const starRow = new Adw.ActionRow({ title: 'You love this extension ?' });
    starRow.add_suffix(githubButton);

    const infoGroup = new Adw.PreferencesGroup();
    infoGroup.add(dataRow);
    infoGroup.add(versionRow);
    infoGroup.add(starRow);

    const page = new Adw.PreferencesPage();
    page.add(group);
    page.add(infoGroup);

    window.add(page);
}
