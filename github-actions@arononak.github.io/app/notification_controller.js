'use strict';

const extension = imports.misc.extensionUtils.getCurrentExtension();

const { showNotification } = extension.imports.app.widgets;

var NotificationController = class {
    static showDownloadArtifact(success, filename) {
        if (success === true) {
            showNotification(`The artifact has been downloaded, check your home directory.\n\n${filename}`, true);
        } else {
            showNotification('Something went wrong :/', false);
        }
    }

    static showSetAsWatched(owner, repo) {
        showNotification(`${owner}/${repo} - set as watched !`, true);
    }

    static showDeleteWorkflowRun(success, runName) {
        if (success === true) {
            showNotification(`The Workflow run was successfully deleted.\n\n${runName}`, true);
        } else {
            showNotification('Something went wrong :/', false);
        }
    }

    static showCancelWorkflowRun(success, runName) {
        if (success === true) {
            showNotification(`The Workflow run was successfully cancelled.\n\n${runName}`, true);
        } else {
            showNotification('Something went wrong :/', false);
        }
    }

    static showRerunWorkflowRun(success, runName) {
        if (success === true) {
            showNotification(`The Workflow run was successfully re-runed.\n\n${runName}`, true);
        } else {
            showNotification('Something went wrong :/', false);
        }
    }

    static showCompletedBuild(owner, repo, conclusion) {
        switch (conclusion) {
            case 'success':
                showNotification(`${owner}/${repo} - The workflow has been successfully built`, true);
                break;
            case 'failure':
                showNotification(`${owner}/${repo} - Failed :/`, false);
                break;
            case 'cancelled':
                showNotification(`${owner}/${repo} - Cancelled`, false);
                break;
        }
    }
}