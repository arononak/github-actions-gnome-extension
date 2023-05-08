'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    const row = new Adw.ActionRow({ title: 'Show icon' });
    group.add(row);

    const toggle = new Gtk.Switch({ active: settings.get_boolean('show-icon'), valign: Gtk.Align.CENTER });

    settings.bind('show-icon', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);

    const ownerRow = new Adw.ActionRow();
    const ownerEntry = new Gtk.Entry({ buffer: new Gtk.EntryBuffer({ text: settings.get_string('owner') }), hexpand: true, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER });
    group.add(ownerRow);
    ownerRow.add_prefix(new Gtk.Label({ label: 'owner' }));
    ownerRow.add_suffix(ownerEntry);
    ownerRow.activatable_widget = ownerEntry;

    const repoRow = new Adw.ActionRow();
    const repoEntry = new Gtk.Entry({ buffer: new Gtk.EntryBuffer({ text: settings.get_string('repo') }), hexpand: true, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER });
    group.add(repoRow);
    repoRow.add_prefix(new Gtk.Label({ label: 'repo' }));
    repoRow.add_suffix(repoEntry);
    repoRow.activatable_widget = repoEntry;

    const group2 = new Adw.PreferencesGroup();
    page.add(group2);
    const button = new Gtk.Button({ label: 'Enter' });
    group2.add(button);
    button.connect('clicked', () => {
        settings.set_string('owner', ownerEntry.get_buffer().text);
        settings.set_string('repo', repoEntry.get_buffer().text);
        window.destroy();
    });

    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    window.add(page);
}
