import { GithubService } from './github_service.js'

const DataTypeEnum = {
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

    async isInstalledCli() {
        return await this.githubService.isInstalledCli()
    }

    async isLogged() {
        return await this.githubService.isLogged()
    }

    async tokenScopes() {
        return await this.githubService.tokenScopes()
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

            const workflowRunsResponse = await this.githubService.fetchWorkflowRuns(owner, repo, 1)
            switch (workflowRunsResponse) {
                case null:
                    onIncorrectRepository()
                    return
                case `no-internet-connection`:
                    onNoInternet()
                    return
            }

            onDownloadPackageSize(workflowRunsResponse[`_size_`])

            const workflowRuns = workflowRunsResponse[`workflow_runs`]
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

            const newestRelease = await this.githubService.fetcNewestExtensionRelease()
            const newestVersion = newestRelease[0][`tag_name`]
            if (newestVersion != undefined) {
                settingsRepository.updateNewestVersion(newestVersion)
            }

            if (type === DataTypeEnum.ONLY_RUNS) {
                const { runs } = await this._fetchRepo(settingsRepository, true)
                onRunsDownloaded(runs[`workflow_runs`])
                return
            }

            const userObject = await this._fetchUser(settingsRepository)

            onUserDownloaded(userObject)

            if (type === DataTypeEnum.ONLY_USER) {
                settingsRepository.updateTransfer(Object.values(userObject))
                return
            }

            const repoObject = await this._fetchRepo(settingsRepository)

            settingsRepository.updateTransfer([...Object.values(userObject), ...Object.values(repoObject)])

            onRunsDownloaded(repoObject[`runs`][`workflow_runs`])
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
                    resolve({
                        user,
                        minutes,
                        packages,
                        sharedStorage,
                    })

                    return
                }

                const pagination = settingsRepository.fetchPagination()

                // Full Mode
                const starredList = await this.githubService.fetchUserStarred(login, pagination)
                const followers = await this.githubService.fetchUserFollowers(pagination)
                const following = await this.githubService.fetchUserFollowing(pagination)
                const repos = await this.githubService.fetchUserRepos(pagination)
                const gists = await this.githubService.fetchUserGists(pagination)
                const starredGists = await this.githubService.fetchUserStarredGists(pagination)

                resolve({
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
                })
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
                const pagination = settingsRepository.fetchPagination()

                const runs = await this.githubService.fetchWorkflowRuns(owner, repo, pagination)

                if (onlyWorkflowRuns === true) {
                    resolve({ runs })
                    return
                }

                const simpleMode = settingsRepository.fetchSimpleMode()
                const artifacts = await this.githubService.fetchArtifacts(owner, repo, pagination)

                if (simpleMode) {
                    resolve({ runs, artifacts })
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

                resolve({
                    runs,
                    artifacts,

                    userRepo,
                    workflows,
                    stargazers,
                    releases,
                    branches,
                    tags,
                    issues,
                    pullRequests,
                    commits,
                })
            } catch (error) {
                logError(error)
                resolve(null)
            }
        })
    }
}
