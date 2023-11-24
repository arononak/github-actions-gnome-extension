'use strict'

import { formatDate, extensionSettings } from './widgets.js'
import { SettingsRepository } from './settings_repository.js'

export class DateFormatController {
    static format(date) {
        const settings = extensionSettings()
        const settingsRepository = new SettingsRepository(settings)
        const locale = settingsRepository.fetchLocale()

        return formatDate(date, locale)
    }
}
