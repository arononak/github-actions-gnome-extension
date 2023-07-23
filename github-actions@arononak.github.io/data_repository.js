'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const cliInterface = Me.imports.local_cli_interface;

var isInstalledCli = async () =>
    cliInterface.isGitHubCliInstalled();

var isLogged = async () =>
    cliInterface.isLogged();

var logoutUser = async () =>
    cliInterface.logoutUser();

var fetchUser = async () =>
    cliInterface.executeGithubCliCommand('GET', 'user');

var fetchUserBillingActionsMinutes = async (username) =>
    cliInterface.executeGithubCliCommand('GET', `users/${username}/settings/billing/actions`);

var fetchUserBillingPackages = async (username) =>
    cliInterface.executeGithubCliCommand('GET', `users/${username}/settings/billing/packages`)

var fetchUserBillingSharedStorage = async (username) =>
    cliInterface.executeGithubCliCommand('GET', `users/${username}/settings/billing/shared-storage`);

var fetchUserRepo = async (owner, repo) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}`);

var downloadArtifactFile = async (downloadUrl, filename) =>
    cliInterface.downloadArtifactFile(downloadUrl, filename);

/// Pagoinated lists
var fetchUserRepos = async (pagination) =>
    cliInterface.executeGithubCliCommand('GET', 'user/repos', pagination);

var fetchUserStarred = async (username, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `users/${username}/starred`, pagination);

var fetchUserFollowers = async (pagination) =>
    cliInterface.executeGithubCliCommand('GET', 'user/followers', pagination);

var fetchUserFollowing = async (pagination) =>
    cliInterface.executeGithubCliCommand('GET', 'user/following', pagination)

var fetchWorkflows = async (owner, repo, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/actions/workflows`, pagination);

var fetchWorkflowRuns = async (owner, repo, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/actions/runs`, pagination);

var fetchArtifacts = async (owner, repo, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/actions/artifacts`, pagination);

var fetchStargazers = async (owner, repo, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/stargazers`, pagination);

var fetchReleases = async (owner, repo, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/releases`, pagination);

var fetchBranches = async (owner, repo, pagination) =>
    cliInterface.executeGithubCliCommand('GET', `repos/${owner}/${repo}/branches`, pagination);

/// Delete
var deleteWorkflowRun = async (owner, repo, runId) =>
    cliInterface.executeGithubCliCommand('DELETE', `repos/${owner}/${repo}/actions/runs/${runId}`);
