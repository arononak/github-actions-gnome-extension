'use strict';

const { Adw, Gio, Gtk, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const utils = Me.imports.utils;     // utils.js
const version = Me.imports.version; // version.js

function init() { }

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();

    const ownerRow = new Adw.ActionRow();
    const ownerEntry = new Gtk.Entry({ buffer: new Gtk.EntryBuffer({ text: settings.get_string('owner') }), hexpand: true, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER });
    ownerRow.add_prefix(new Gtk.Label({ label: 'Owner' }));
    ownerRow.add_suffix(ownerEntry);
    ownerRow.activatable_widget = ownerEntry;
    ownerEntry.connect('changed', (widget) => {
        if (ownerEntry.get_buffer().text) {
            settings.set_string('owner', ownerEntry.get_buffer().text);
        }
    });

    const repoRow = new Adw.ActionRow();
    const repoEntry = new Gtk.Entry({ buffer: new Gtk.EntryBuffer({ text: settings.get_string('repo') }), hexpand: true, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER });
    repoRow.add_prefix(new Gtk.Label({ label: 'Repo' }));
    repoRow.add_suffix(repoEntry);
    repoRow.activatable_widget = repoEntry;
    repoEntry.connect('changed', (widget) => {
        if (repoEntry.get_buffer().text) {
            settings.set_string('repo', repoEntry.get_buffer().text);
        }
    });

    const spinButton = new Gtk.SpinButton({
        climb_rate: 1,
        digits: 0,
    });
    spinButton.adjustment = new Gtk.Adjustment({
        value: utils.prefsRefreshTime(settings),
        lower: 1,
        upper: 60,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    });
    spinButton.wrap = true;
    spinButton.width_chars = 2;
    const refreshRow = new Adw.ActionRow();
    refreshRow.add_prefix(new Gtk.Label({ label: 'Refresh time in s.' }));
    refreshRow.add_suffix(spinButton);
    refreshRow.activatable_widget = spinButton;
    settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    const tipRow = new Adw.ActionRow();
    tipRow.add_prefix(new Gtk.Label({ label: 'Changing the time requires restarting the extension', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    group.add(ownerRow);
    group.add(repoRow);
    group.add(refreshRow);
    group.add(tipRow);

    page.add(group);

    const dataRow = new Adw.ActionRow({ title: 'Data package size ' });
    dataRow.add_suffix(new Gtk.Label({ label: utils.prefsPackageSize(settings), halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const versionRow = new Adw.ActionRow();
    versionRow.add_prefix(new Gtk.Label({ label: 'Version: ', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));
    versionRow.add_suffix(new Gtk.Label({ label: version.VERSION, halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    const githubButton = new Gtk.Button({ label: 'Give me a star!' });
    const starRow = new Adw.ActionRow();
    starRow.add_prefix(new Gtk.Label({ label: 'You love this extension ?', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));
    starRow.add_suffix(githubButton);

    githubButton.connect('clicked', () => {
        try {
            GLib.spawn_command_line_async('xdg-open ' + 'https://github.com/arononak/github-actions-gnome-extension');
        } catch (e) {
            logError(e);
        }
    });

    const infoGroup = new Adw.PreferencesGroup();

    infoGroup.add(dataRow);
    infoGroup.add(versionRow);
    infoGroup.add(starRow);
    page.add(infoGroup);

    window.add(page);
}
