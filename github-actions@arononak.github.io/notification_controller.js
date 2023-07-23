const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { showNotification } = Me.imports.widgets;

function showDownloadArtifactNotification(success, filename) {
    if (success === true) {
        showNotification(`The artifact has been downloaded, check your home directory.\n\n${filename}`, true);
    } else {
        showNotification('Something went wrong :/', false);
    }
}

function showSetAsWatchedNotification(owner, repo) {
    showNotification(`${owner}/${repo} - set as watched !`, true);
}

function showDeleteWorkflowRunNotification(success, runName) {
    if (success === true) {
        showNotification(`The Workflow run was successfully deleted.\n\n${runName}`, true);
    } else {
        showNotification('Something went wrong :/', false);
    }
}

function showCompletedBuildNotification(owner, repo, conclusion) {
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
