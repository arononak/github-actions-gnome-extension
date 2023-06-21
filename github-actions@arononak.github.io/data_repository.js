'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const repository = Me.imports.local_cli_data_repository;

var isLogged = async () =>
    repository.isLogged();

var fetchUser = async () =>
    repository.executeGithubCliCommand('/user');

var fetchUserStarred = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/starred');

var fetchUserFollowers = async () =>
    repository.executeGithubCliCommand('/user/followers');

var fetchUserFollowing = async () =>
    repository.executeGithubCliCommand('/user/following')

var fetchUserBillingActionsMinutes = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/settings/billing/actions');

var fetchUserBillingPackages = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/settings/billing/packages')

var fetchUserBillingSharedStorage = async (username) =>
    repository.executeGithubCliCommand('/users/' + username + '/settings/billing/shared-storage');

var fetchWorkflows = async (owner, repo) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/workflows');

var fetchWorkflowRuns = async (owner, repo) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/runs');

var fetchArtifacts = async (owner, repo) =>
    repository.executeGithubCliCommand('/repos/' + owner + '/' + repo + '/actions/artifacts');
