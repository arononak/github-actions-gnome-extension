'use strict'

import Gtk from 'gi://Gtk'
import Adw from 'gi://Adw'

import {
    isEmpty as _isEmpty,
    openUrl as _openUrl,
    openExtensionGithubIssuesPage as _openExtensionGithubIssuesPage,
} from './utils.js'

export function isEmpty(str) {
    return _isEmpty(str)
}

export function openUrl(url) {
    return _openUrl(url)
}

export function openExtensionGithubIssuesPage() {
    return _openExtensionGithubIssuesPage()
}

export function createButtonRow({ title, subtitle, buttonLabel, onButtonPressed }) {
    const button = new Gtk.Button({ label: buttonLabel })
    button.set_size_request(120, -1)
    button.connect(`clicked`, onButtonPressed)
    button.margin_top = 16
    button.margin_bottom = 16

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })

    row.add_suffix(button)

    return row
}

export function createEntityRow({ title, text, onChanged }) {
    const entry = new Gtk.Entry({
        buffer: new Gtk.EntryBuffer({ text }),
        hexpand: true,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
    })
    entry.set_size_request(300, -1)
    entry.connect(`changed`, (widget) => {
        const entryText = entry.get_buffer().text

        if (entryText !== null && entryText !== undefined) {
            onChanged(entryText);
        }
    })

    const row = new Adw.ActionRow({ title })
    row.add_suffix(entry)
    row.activatable_widget = entry

    return row
}

export function createSpinButtonRow({ title, subtitle, value, lower, upper, onSpinButtonCreated }) {
    const spinButton = new Gtk.SpinButton({ climb_rate: 1, digits: 0 })
    spinButton.set_size_request(120, -1)
    spinButton.wrap = true
    spinButton.width_chars = 2
    spinButton.margin_top = 8
    spinButton.margin_bottom = 8
    spinButton.adjustment = new Gtk.Adjustment({
        value,
        lower,
        upper,
        step_increment: 1,
        page_increment: 10,
        page_size: 0,
    })

    onSpinButtonCreated(spinButton)

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })

    row.add_suffix(spinButton)
    row.activatable_widget = spinButton

    return row
}

export function createToggleRow({ title, subtitle, value, onSwitchButtonCreated }) {
    const switchButton = new Gtk.Switch({ active: value, valign: Gtk.Align.CENTER })
    onSwitchButtonCreated(switchButton)

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })
    row.add_suffix(switchButton)
    row.activatable_widget = switchButton

    return row
}

export function createComboBox({ title, subtitle, value, values, onChanged }) {
    const comboBox = new Gtk.ComboBoxText()
    comboBox.set_size_request(120, -1)
    comboBox.margin_top = 8
    comboBox.margin_bottom = 8
    values.forEach((element) => comboBox.append_text(element))

    const row = new Adw.ActionRow({
        title: title == undefined ? null : title,
        subtitle: subtitle == undefined ? null : subtitle,
    })
    row.add_suffix(comboBox)
    row.activatable_widget = comboBox

    const selectedIndex = values.indexOf(value);
    comboBox.set_active(selectedIndex)

    comboBox.connect(`changed`, (widget) => {
        const text = widget.get_active_text();
        onChanged(text)
        row.subtitle = text
    })

    return row
}
