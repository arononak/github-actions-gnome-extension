'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

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
        value: settings.get_int('refresh-time'),
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

    group.add(ownerRow);
    group.add(repoRow);
    group.add(refreshRow);
    group.add(new Gtk.Label({ label: ' '})); /// Separator
    group.add(new Gtk.Label({ label: 'Changing the time requires restarting the extension', halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));
    group.add(new Gtk.Label({ label: ' '})); /// Separator
    group.add(new Gtk.Label({ label: 'Data package size ' + parseInt(settings.get_int('package-size-in-bytes') / 1024, 10) + " KB", halign: Gtk.Align.START, valign: Gtk.Align.CENTER }));

    page.add(group);

    window.add(page);
}
