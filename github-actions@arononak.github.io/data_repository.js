'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const repository = Me.imports.local_cli_data_repository;

var isLogged = async () =>
    repository.isLogged();

var fetchUser = async () =>
    repository.executeGithubCliCommand('/user');

var fetchUserBillingActionsMinutes = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/settings/billing/actions');

var fetchUserBillingPackages = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/settings/billing/packages')

var fetchUserBillingSharedStorage = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/settings/billing/shared-storage');

var downloadArtifact = async (downloadUrl, filename) =>
    repository.downloadArtifact(downloadUrl, filename);

/// Pagoinated lists
var fetchUserStarred = async (username, pagination) =>
    repository.executeGithubCliCommand('/users/' + username + '/starred', pagination);

var fetchUserFollowers = async (pagination) =>
    repository.executeGithubCliCommand('/user/followers', pagination);

var fetchUserFollowing = async (pagination) =>
    repository.executeGithubCliCommand('/user/following', pagination)

var fetchWorkflows = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/workflows', pagination);

var fetchWorkflowRuns = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/runs', pagination);

var fetchArtifacts = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/artifacts', pagination);

var fetchStargazers = async (owner, repo, pagination) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/stargazers', pagination);
