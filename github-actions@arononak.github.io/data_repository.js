'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const repository = Me.imports.local_cli_interface;

var isInstalledCli = async () =>
    repository.isGitHubCliInstalled();

var isLogged = async () =>
    repository.isLogged();

var logout = async () =>
    repository.logout();

var fetchUser = async () =>
    repository.executeGithubCliCommand('GET', '/user');

var fetchUserBillingActionsMinutes = async (username) =>
    repository.executeGithubCliCommand('GET', '/users/' + username + '/settings/billing/actions');

var fetchUserBillingPackages = async (username) =>
    repository.executeGithubCliCommand('GET', '/users/' + username + '/settings/billing/packages')

var fetchUserBillingSharedStorage = async (username) =>
    repository.executeGithubCliCommand('GET', '/users/' + username + '/settings/billing/shared-storage');

var downloadArtifact = async (downloadUrl, filename) =>
    repository.downloadArtifact(downloadUrl, filename);

/// Pagoinated lists
var fetchUserStarred = async (username, pagination) =>
    repository.executeGithubCliCommand('GET', '/users/' + username + '/starred', pagination);

var fetchUserFollowers = async (pagination) =>
    repository.executeGithubCliCommand('GET', '/user/followers', pagination);

var fetchUserFollowing = async (pagination) =>
    repository.executeGithubCliCommand('GET', '/user/following', pagination)

var fetchWorkflows = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('GET', '/repos/' + owner + '/' + repo + '/actions/workflows', pagination);

var fetchWorkflowRuns = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('GET', '/repos/' + owner + '/' + repo + '/actions/runs', pagination);

var fetchArtifacts = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('GET', '/repos/' + owner + '/' + repo + '/actions/artifacts', pagination);

var fetchStargazers = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('GET', '/repos/' + owner + '/' + repo + '/stargazers', pagination);

var fetchReleases = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('GET', '/repos/' + owner + '/' + repo + '/releases', pagination);

var fetchBranches = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('GET', '/repos/' + owner + '/' + repo + '/branches', pagination);

/// Delete
var deleteWorkflowRun = async (owner, repo, runId) =>
    repository.executeGithubCliCommand('DELETE', '/repos/' + owner + '/' + repo + '/actions/runs/' + runId);
