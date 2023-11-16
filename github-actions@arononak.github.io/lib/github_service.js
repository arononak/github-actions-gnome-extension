'use strict'

import { removeWhiteChars } from './utils.js'
import { TokenScopes } from './token_scopes.js'
import * as cliInterface from './local_cli_interface.js'

export class GithubService {
    isInstalledCli = () =>
        cliInterface.isGitHubCliInstalled()

    isLogged = () =>
        cliInterface.isLogged()

    logoutUser = () =>
        cliInterface.logoutUser()

    token = () =>
        cliInterface.token()

    tokenScopes = async () => {
        const authStatus = await cliInterface.authStatus()

        if (authStatus == null) {
            return ``
        }

        const lastLine = authStatus.substring(authStatus.lastIndexOf(`✓`))
        const scopesLine = lastLine.substring(lastLine.indexOf(`:`) + 1)

        const scopesArray = removeWhiteChars(scopesLine).split(`,`)

        return new TokenScopes(scopesArray)
    }

    fetchUser = () =>
        cliInterface.executeGithubCliCommand(`GET`, `/user`)

    fetchUserBillingActionsMinutes = (username) =>
        cliInterface.executeGithubCliCommand(`GET`, `/users/${username}/settings/billing/actions`)

    fetchUserBillingPackages = (username) =>
        cliInterface.executeGithubCliCommand(`GET`, `/users/${username}/settings/billing/packages`)

    fetchUserBillingSharedStorage = (username) =>
        cliInterface.executeGithubCliCommand(`GET`, `/users/${username}/settings/billing/shared-storage`)

    fetchUserRepo = (owner, repo) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}`)

    checkIsRepoStarred = (owner, repo) =>
        cliInterface.executeGithubCliCommand(`GET`, `/user/starred/${owner}/${repo}`)

    downloadArtifactFile = (downloadUrl, filename) =>
        cliInterface.downloadArtifactFile(downloadUrl, filename)

    // Pagoinated lists
    fetchUserRepos = (pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/user/repos`, pagination)

    fetchUserGists = (pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/gists`, pagination)

    fetchUserStarredGists = (pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/gists/starred`, pagination)

    fetchUserStarred = (username, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/users/${username}/starred`, pagination)

    fetchUserFollowers = (pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/user/followers`, pagination)

    fetchUserFollowing = (pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/user/following`, pagination)

    fetchWorkflows = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/actions/workflows`, pagination)

    fetchArtifacts = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/actions/artifacts`, pagination)

    fetchStargazers = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/stargazers`, pagination)

    fetchReleases = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/releases`, pagination)

    fetchBranches = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/branches`, pagination)

    fetchTags = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/tags`, pagination)

    fetchIssues = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/issues`, pagination)

    fetchPullRequests = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/pulls`, pagination)

    fetchCommits = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/commits`, pagination)

    fetchLabels = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/labels`, pagination)

    // Workflow Run
    fetchWorkflowRuns = (owner, repo, pagination) =>
        cliInterface.executeGithubCliCommand(`GET`, `/repos/${owner}/${repo}/actions/runs`, pagination)

    cancelWorkflowRun = (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand(`POST`, `/repos/${owner}/${repo}/actions/runs/${runId}/cancel`)

    rerunWorkflowRun = (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand(`POST`, `/repos/${owner}/${repo}/actions/runs/${runId}/rerun`)

    deleteWorkflowRun = (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand(`DELETE`, `/repos/${owner}/${repo}/actions/runs/${runId}`)

    fetcNewestExtensionRelease = () =>
        cliInterface.executeGithubCliCommand(`GET`, `https://api.github.com/repos/arononak/github-actions-gnome-extension/releases`, 1)
}
