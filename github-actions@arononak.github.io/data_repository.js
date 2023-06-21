'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const repository = Me.imports.local_cli_data_repository;

var isLogged = async function () {
    return repository.isLogged();
}

/// User
var fetchUser = async function () {
    return repository.executeGithubCliCommand('/user');
}

/// User starred
var fetchUserStarred = async function (username) {
    return repository.executeGithubCliCommand('/users/' + username + '/starred');
}

/// User followers
var fetchUserFollowers = async function () {
    return repository.executeGithubCliCommand('/user/followers');
}

/// User following
var fetchUserFollowing = async function () {
    return repository.executeGithubCliCommand('/user/following');
}

/// User billing
var fetchUserBillingActionsMinutes = async function (username) {
    return repository.executeGithubCliCommand('/users/' + username + '/settings/billing/actions');
}

var fetchUserBillingPackages = async function (username) {
    return repository.executeGithubCliCommand('/users/' + username + '/settings/billing/packages');
}

var fetchUserBillingSharedStorage = async function (username) {
    return repository.executeGithubCliCommand('/users/' + username + '/settings/billing/shared-storage');
}

/// Workflows
var fetchWorkflows = async function (owner, repo) {
    return repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/workflows');
}

/// Workflows runs
var fetchWorkflowRuns = async function (owner, repo) {
    return repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/runs');
}

/// Artifacts
var fetchArtifacts = async function (owner, repo) {
    return repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/artifacts');
}
