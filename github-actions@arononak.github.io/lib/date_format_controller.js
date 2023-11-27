'use strict'

import { extensionSettings } from './extension_utils.js'
import { SettingsRepository } from './settings_repository.js'

export class DateFormatController {
    static format(date) {
        const settings = extensionSettings()
        const settingsRepository = new SettingsRepository(settings)
        const locale = settingsRepository.fetchLocale()

        return DateFormatController.formatDate(date, locale)
    }

    static formatDate(date, locale = `en-GB`) {
        const options = {
            day: `2-digit`,
            month: `2-digit`,
            year: `numeric`
        }

        return new Date(date).toLocaleDateString(locale, options)
    }
}
