'use strict'

import { GithubService } from './github_service.js'
import { CacheRepository } from './cache_repository.js'

export const DataTypeEnum = {
    FULL: `full`,
    ONLY_USER: `only_user`,
    ONLY_RUNS: `only_runs`,
}

export class ExtensionRepository {
    constructor() {
        this.githubService = new GithubService()
    }

    async logoutUser() {
        await this.githubService.logoutUser()
    }

    async fetchToken() {
        return await this.githubService.token()
    }

    async fetchCliVersion() {
        return await this.githubService.cliVersion()
    }

    async isInstalledCli() {
        return await this.githubService.isInstalledCli()
    }

    async isLogged() {
        return await this.githubService.isLogged()
    }

    async tokenScopes() {
        return await this.githubService.tokenScopes()
    }

    async zen() {
        return await this.githubService.zen()
    }

    async downloadArtifactFile(downloadUrl, filename) {
        return await this.githubService.downloadArtifactFile(downloadUrl, filename)
    }

    async deleteWorkflowRun(owner, repo, runId) {
        return await this.githubService.deleteWorkflowRun(owner, repo, runId)
    }

    async cancelWorkflowRun(owner, repo, runId) {
        return await this.githubService.cancelWorkflowRun(owner, repo, runId)
    }

    async rerunWorkflowRun(owner, repo, runId) {
        return await this.githubService.rerunWorkflowRun(owner, repo, runId)
    }

    async checkErrors({
        onNotInstalledCli,
        onNotLogged,
        onSuccess,
    }) {
        try {
            const isInstalledCli = await this.githubService.isInstalledCli()
            if (isInstalledCli == false) {
                onNotInstalledCli()
                return
            }

            const isLogged = await this.githubService.isLogged()
            if (isLogged == false) {
                onNotLogged()
                return
            }

            onSuccess()
        } catch (error) {
            logError(error)
        }
    }

    async fetchStatus({
        owner,
        repo,
        onNoInternet,
        onIncorrectRepository,
        onDownloadPackageSize,
        onRepoWithoutActions,
        onCompleted,
    }) {
        try {
            const isLogged = await this.githubService.isLogged()
            if (isLogged == false) {
                return
            }

            const newestVersion = await this.githubService.fetcNewestExtensionRelease()
            if (newestVersion == `no-internet-connection`) {
                onNoInternet()
                return
            }

            const workflowRuns = await this.githubService.fetchWorkflowRuns(owner, repo, 1)
            if (workflowRuns == null) {
                onIncorrectRepository()
                return
            }

            onDownloadPackageSize(workflowRuns[`_size_`])

            if (workflowRuns.length == 0) {
                onRepoWithoutActions()
                return
            }

            onCompleted(workflowRuns[0])
        } catch (error) {
            logError(error)
        }
    }

    async fetchData({
        type,
        settingsRepository,
        onUserDownloaded,
        onRunsDownloaded,
        onRepoDownloaded,
    }) {
        try {
            const isLogged = await this.githubService.isLogged()
            if (isLogged == false) {
                return
            }

            // TODO: Change Onwer to Login after migration to multirepo
            const { owner, repo } = settingsRepository.ownerAndRepo()

            // Cache User
            const cacheUser = CacheRepository.fetchUser(owner)
            if (cacheUser != null) {
                onUserDownloaded(cacheUser)
            }

            // Cache Repo
            const cacheRepo = CacheRepository.fetchRepo(owner, repo)
            if (cacheRepo != null) {
                onRepoDownloaded(cacheRepo)
            }

            // Check no-internet
            const newestRelease = await this.githubService.fetcNewestExtensionRelease()
            if (newestRelease == `no-internet-connection`) return

            // Update newest version
            const newestVersion = newestRelease[0][`tag_name`]
            if (newestVersion != undefined) {
                settingsRepository.updateNewestVersion(newestVersion)
            }

            // Check CLI Version
            const cliVersion = await this.githubService.cliVersion()
            if (cliVersion != undefined) {
                settingsRepository.updateCliVersion(cliVersion)
            }

            if (type === DataTypeEnum.ONLY_RUNS) {
                const { runs } = await this._fetchRepo(settingsRepository, true)
                if (runs == null || runs == undefined) return

                onRunsDownloaded(runs)

                return
            }

            const userObject = await this._fetchUser(settingsRepository)
            if (userObject == null || userObject == undefined) return

            onUserDownloaded(userObject)

            if (type === DataTypeEnum.ONLY_USER) {
                settingsRepository.updateTransfer(Object.values(userObject))
                return
            }

            const repoObject = await this._fetchRepo(settingsRepository)
            if (repoObject == null || repoObject == undefined) return

            settingsRepository.updateTransfer([...Object.values(userObject), ...Object.values(repoObject)])

            onRunsDownloaded(repoObject[`runs`])
            onRepoDownloaded(repoObject)
        } catch (error) {
            logError(error)
        }
    }

    _fetchUser(settingsRepository) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.githubService.fetchUser()
                if (user == null) {
                    return
                }

                const login = user[`login`]

                // Simple Mode
                const minutes = await this.githubService.fetchUserBillingActionsMinutes(login)
                const packages = await this.githubService.fetchUserBillingPackages(login)
                const sharedStorage = await this.githubService.fetchUserBillingSharedStorage(login)

                // Hidden Mode
                const simpleMode = settingsRepository.fetchSimpleMode()
                const { owner, repo } = settingsRepository.ownerAndRepo()
                const isStarred = await this.githubService.checkIsRepoStarred(owner, repo)
                settingsRepository.updateHiddenMode(isStarred === `success`)

                if (simpleMode) {
                    const userObject = {
                        user,
                        minutes,
                        packages,
                        sharedStorage,
                    }

                    CacheRepository.updateUser(login, userObject)
                    resolve(userObject)
                    return
                }

                let pagination = settingsRepository.fetchPagination()
                if (pagination === 0) {
                    pagination = undefined
                }

                // Full Mode
                const starredList = await this.githubService.fetchUserStarred(login, pagination)
                const followers = await this.githubService.fetchUserFollowers(pagination)
                const following = await this.githubService.fetchUserFollowing(pagination)
                const repos = await this.githubService.fetchUserRepos(pagination)
                const gists = await this.githubService.fetchUserGists(pagination)
                const starredGists = await this.githubService.fetchUserStarredGists(pagination)

                const userObject = {
                    user,
                    minutes,
                    packages,
                    sharedStorage,

                    starredList,
                    followers,
                    following,
                    repos,
                    gists,
                    starredGists,
                }

                CacheRepository.updateUser(login, userObject)
                resolve(userObject)
            } catch (error) {
                logError(error)
                resolve(null)
            }
        })
    }

    _fetchRepo(settingsRepository, onlyWorkflowRuns = false) {
        return new Promise(async (resolve, reject) => {
            try {
                const { owner, repo } = settingsRepository.ownerAndRepo()
                let pagination = settingsRepository.fetchPagination()
                if (pagination === 0) {
                    pagination = undefined
                }

                const runs = await this.githubService.fetchWorkflowRuns(owner, repo, pagination)

                if (onlyWorkflowRuns === true) {
                    resolve({
                        runs,
                    })
                    return
                }

                const simpleMode = settingsRepository.fetchSimpleMode()
                const artifacts = await this.githubService.fetchArtifacts(owner, repo, pagination)

                if (simpleMode) {
                    const repoObject = {
                        runs,
                        artifacts,
                    }

                    CacheRepository.updateRepo(owner, repo, repoObject)
                    resolve(repoObject)
                    return
                }

                const userRepo = await this.githubService.fetchUserRepo(owner, repo)
                const workflows = await this.githubService.fetchWorkflows(owner, repo, pagination)
                const stargazers = await this.githubService.fetchStargazers(owner, repo, pagination)
                const releases = await this.githubService.fetchReleases(owner, repo, pagination)
                const branches = await this.githubService.fetchBranches(owner, repo, pagination)
                const tags = await this.githubService.fetchTags(owner, repo, pagination)
                const issues = await this.githubService.fetchIssues(owner, repo, pagination)
                const pullRequests = await this.githubService.fetchPullRequests(owner, repo, pagination)
                const commits = await this.githubService.fetchCommits(owner, repo, pagination)
                const collaborators = await this.githubService.fetchCollaborators(owner, repo, pagination)
                const labels = await this.githubService.fetchLabels(owner, repo, pagination)
                const milestones = await this.githubService.fetchMilestones(owner, repo, pagination)

                const repoObject = {
                    runs,
                    artifacts,

                    userRepo,
                    workflows,
                    stargazers,
                    releases,
                    branches,
                    tags,
                    pullRequests,
                    commits,
                    issues,
                    collaborators,
                    labels,
                    milestones,
                }

                CacheRepository.updateRepo(owner, repo, repoObject)
                resolve(repoObject)
            } catch (error) {
                logError(error)
                resolve(null)
            }
        })
    }
}
