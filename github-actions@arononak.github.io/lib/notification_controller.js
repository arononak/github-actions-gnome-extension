'use strict'

import { showNotification, extensionSettings } from './widgets.js'
import { SettingsRepository } from './settings_repository.js'

export class NotificationController {
    static showDownloadArtifact(success, filename) {
        if (this.notificationsEnabled() == false) return

        if (success === true) {
            showNotification(`The artifact has been downloaded, check your home directory.\n\n${filename}`, true)
        } else {
            showNotification(`Something went wrong :/`, false)
        }
    }

    static showSetAsWatched(owner, repo) {
        if (this.notificationsEnabled() == false) return

        showNotification(`${owner}/${repo} - set as watched !`, true)
    }

    static showDeleteWorkflowRun(success, runName) {
        if (this.notificationsEnabled() == false) return

        if (success === true) {
            showNotification(`The Workflow run was successfully deleted.\n\n${runName}`, true)
        } else {
            showNotification(`Something went wrong :/`, false)
        }
    }

    static showCancelWorkflowRun(success, runName) {
        if (this.notificationsEnabled() == false) return

        if (success === true) {
            showNotification(`The Workflow run was successfully cancelled.\n\n${runName}`, true)
        } else {
            showNotification(`Something went wrong :/`, false)
        }
    }

    static showRerunWorkflowRun(success, runName) {
        if (this.notificationsEnabled() == false) return

        if (success === true) {
            showNotification(`The Workflow run was successfully re-runed.\n\n${runName}`, true)
        } else {
            showNotification(`Something went wrong :/`, false)
        }
    }

    static showCompletedBuild(owner, repo, conclusion) {
        if (this.notificationsEnabled() == false) return
        
        switch (conclusion) {
            case `success`:
                showNotification(`${owner}/${repo} - The workflow has been successfully built`, true)
                break
            case `failure`:
                showNotification(`${owner}/${repo} - Failed :/`, false)
                break
            case `cancelled`:
                showNotification(`${owner}/${repo} - Cancelled`, false)
                break
        }
    }

    static notificationsEnabled() {
        const settings = extensionSettings()
        const settingsRepository = new SettingsRepository(settings)
        const enabled = settingsRepository.fetchShowNotifications()

        return enabled == true
    }
}