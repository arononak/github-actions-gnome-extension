'use strict'

import { TokenScopes } from './token_scopes.js'
import * as cliInterface from './local_cli_interface.js'

export class GithubService {
    isInstalledCli = () =>
        cliInterface.isGitHubCliInstalled()

    cliVersion = async () => {
        const cliVersionStatus = await cliInterface.cliVersion()

        return cliVersionStatus.match(/\d+\.\d+\.\d+/)[0]
    }

    isLogged = () =>
        cliInterface.isLogged()

    logoutUser = () =>
        cliInterface.logoutUser()

    token = () =>
        cliInterface.token()

    checkIsRepoStarred = (owner, repo) =>
        cliInterface.executeGithubCliCommand(`GET`, `/user/starred/${owner}/${repo}`)

    downloadArtifactFile = (downloadUrl, filename) =>
        cliInterface.downloadArtifactFile(downloadUrl, filename)

    fetcNewestExtensionRelease = () =>
        cliInterface.executeGithubCliCommand(`GET`, `https://api.github.com/repos/arononak/github-actions-gnome-extension/releases`, 1)

    zen = () =>
        cliInterface.zen()

    tokenScopes = async () => {
        const authStatus = await cliInterface.authStatus()

        if (authStatus == null) {
            return new TokenScopes(`NO CONNECTION`)
        }

        const scopesStartIndex = authStatus.indexOf(`Token scopes:`) + `Token scopes:`.length
        const scopesEndIndex = authStatus.indexOf(`\n`, scopesStartIndex)
        const scopes = authStatus
            .slice(scopesStartIndex, scopesEndIndex)
            .trim()
            .replace(/'/g, ``)
            .split(`,`)
            .map((scope) => scope.trim())

        return new TokenScopes(scopes)
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

    // Workflow Run
    cancelWorkflowRun = (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand(`POST`, `/repos/${owner}/${repo}/actions/runs/${runId}/cancel`)

    rerunWorkflowRun = (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand(`POST`, `/repos/${owner}/${repo}/actions/runs/${runId}/rerun`)

    deleteWorkflowRun = (owner, repo, runId) =>
        cliInterface.executeGithubCliCommand(`DELETE`, `/repos/${owner}/${repo}/actions/runs/${runId}`)

    // Pagoinated lists
    fetchWorkflowRuns = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/actions/runs`, pagination, `workflow_runs`)

    fetchUserRepos = (pagination) =>
        this.fetchFullPaginatedList(`/user/repos`, pagination)

    fetchUserGists = (pagination) =>
        this.fetchFullPaginatedList(`/gists`, pagination)

    fetchUserStarredGists = (pagination) =>
        this.fetchFullPaginatedList(`/gists/starred`, pagination)

    fetchUserStarred = (username, pagination) =>
        this.fetchFullPaginatedList(`/users/${username}/starred`, pagination)

    fetchUserFollowers = (pagination) =>
        this.fetchFullPaginatedList(`/user/followers`, pagination)

    fetchUserFollowing = (pagination) =>
        this.fetchFullPaginatedList(`/user/following`, pagination)

    fetchWorkflows = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/actions/workflows`, pagination, `workflows`)

    fetchArtifacts = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/actions/artifacts`, pagination, `artifacts`)

    fetchStargazers = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/stargazers`, pagination)

    fetchReleases = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/releases`, pagination)

    fetchBranches = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/branches`, pagination)

    fetchTags = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/tags`, pagination)

    fetchPullRequests = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/pulls`, pagination)

    fetchCommits = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/commits`, pagination)

    fetchIssues = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/issues?state=all`, pagination)

    fetchCollaborators = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/collaborators`, pagination)

    fetchLabels = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/labels`, pagination)

    fetchMilestones = (owner, repo, pagination) =>
        this.fetchFullPaginatedList(`/repos/${owner}/${repo}/milestones?state=all`, pagination)

    async fetchFullPaginatedList(endpoint, pagination, nestedFieldName) {
        let currentPagination = pagination === undefined ? 100 : pagination

        let page = 1
        let container = []
        let byteSize = 0

        let json
        do {
            json = await cliInterface.executeGithubCliCommand(`GET`, endpoint, currentPagination, page)
            if (json == null) break
            byteSize += json[`_size_`]

            if (nestedFieldName !== undefined) {
                json = json[nestedFieldName]
            }
            container = [...container, ...json]

            page += 1
        } while (json.length === currentPagination && pagination === undefined)

        container[`_size_`] = byteSize

        return container
    }
}
