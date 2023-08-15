'use strict';

const extension = imports.misc.extensionUtils.getCurrentExtension();

const cliInterface = extension.imports.app.local_cli_interface;
const { removeWhitespace } = extension.imports.app.utils;

var GithubApiRepository = class {
    constructor() { }

    isInstalledCli = async () =>
        cliInterface.isGitHubCliInstalled();

    isLogged = async () =>
        cliInterface.isLogged();

    logoutUser = async () =>
        cliInterface.logoutUser();

    tokenScopes = async () => {
        const authStatus = await cliInterface.authStatus();

        if (authStatus == null) {
            return '';
        }

        const lastLine = authStatus.substring(authStatus.lastIndexOf('✓'));
        const scopesLine = lastLine.substring(lastLine.indexOf(':') + 1);

        return scopesLine
            .removeWhitespace()
            .split(',');
    }

    fetchUser = async () =>
        cliInterface.executeGithubCliCommand('GET', 'user');

    fetchUserBillingActionsMinutes = async (username) =>
        cliInterface.executeGithubCliCommand('GET', `users/${username}/settings/billing/actions`);

    fetchUserBillingPackages = async (username) =>
        cliInterface.executeGithubCliCommand('GET', `users/${username}/settings/billing/packages`)

    fetchUserBillingSharedStorage = async (username) =>
        cliInterface.executeGithubCliCommand('GET', `users/${username}/settings/billing/shared-storage`);

    fetchUserRepo = async (owner, repo) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}`);

    checkIsRepoStarred = async (owner, repo) =>
        cliInterface.executeGithubCliCommand('GET', `user/starred/${owner}/${repo}`);

    downloadArtifactFile = async (downloadUrl, filename) =>
        cliInterface.downloadArtifactFile(downloadUrl, filename);

    /// Pagoinated lists
    fetchUserRepos = async (pagination) =>
        cliInterface.executeGithubCliCommand('GET', 'user/repos', pagination);

    fetchUserStarred = async (username, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `users/${username}/starred`, pagination);

    fetchUserFollowers = async (pagination) =>
        cliInterface.executeGithubCliCommand('GET', 'user/followers', pagination);

    fetchUserFollowing = async (pagination) =>
        cliInterface.executeGithubCliCommand('GET', 'user/following', pagination)

    fetchWorkflows = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/actions/workflows`, pagination);

    fetchArtifacts = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/actions/artifacts`, pagination);

    fetchStargazers = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/stargazers`, pagination);

    fetchReleases = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/releases`, pagination);

    fetchBranches = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/branches`, pagination);

    fetchTags = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/tags`, pagination);

    /// Workflow Run
    fetchWorkflowRuns = async (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/actions/runs`, pagination);

    cancelWorkflowRun = async (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand('POST', `repos/${owner}/${repo}/actions/runs/${runId}/cancel`);

    rerunWorkflowRun = async (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand('POST', `repos/${owner}/${repo}/actions/runs/${runId}/rerun`);

    deleteWorkflowRun = async (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand('DELETE', `repos/${owner}/${repo}/actions/runs/${runId}`);
}