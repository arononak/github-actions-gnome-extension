/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

'use strict';

const { GObject } = imports.gi;
const Main = imports.ui.main;

const GETTEXT_DOMAIN = 'github-actions-extension';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {
    isRepositoryEntered,
    fetchPagination,
    fetchSimpleMode,
    fetchColoredMode,
    updateColdPackageSize,
    updatePackageSize,
    updateOwner,
    updateRepo,
    ownerAndRepo,
    fetchRefreshTime,
    fetchRefreshFullUpdateTime,
} = Me.imports.utils;

const {
    showNotification,
} = Me.imports.widgets;

const {
    logout,
    downloadArtifact,
    isInstalledCli,
    isLogged,
    fetchUser,
    fetchUserBillingActionsMinutes,
    fetchUserBillingPackages,
    fetchUserBillingSharedStorage,
    fetchUserStarred,
    fetchUserFollowers,
    fetchUserFollowing,
    fetchUserRepos,
    fetchWorkflows,
    fetchArtifacts,
    fetchStargazers,
    fetchWorkflowRuns,
    fetchReleases,
    fetchBranches,
    fetchUserRepo,
    deleteWorkflowRun,
} = Me.imports.data_repository;

const {
    StatusBarIndicator,
    StatusBarState,
} = Me.imports.status_bar_indicator;

function updateTransfer(settings, jsonObjects) {
    const sizeInBytes = jsonObjects
        .filter(e => e != null)
        .reduce((sum, object) => sum + object._size_, 0);

    updateColdPackageSize(settings, sizeInBytes);
}

async function removeWorkflowRun(settings, indicator, runId, runName) {
    try {
        const { owner, repo } = ownerAndRepo(settings);
        const status = await deleteWorkflowRun(owner, repo, runId);

        if (status == 'success') {
            await dataRefresh(settings, indicator);
            showNotification('The Workflow run was successfully deleted.' + '\n\n' + runName, true);
        } else {
            showNotification('Something went wrong :/', false);
        }
    } catch (error) {
        logError(error);
    }
}

async function stateRefresh(settings, indicator) {
    try {
        indicator.refreshBoredIcon();

        const _isInstalledCli = await isInstalledCli();
        if (_isInstalledCli == false) {
            indicator.setState({ state: StatusBarState.NOT_INSTALLED_CLI });
            return;
        }

        const _isLogged = await isLogged();
        if (_isLogged == false) {
            indicator.setState({ state: StatusBarState.NOT_LOGGED });
            return;
        }

        if (!isRepositoryEntered(settings)) {
            indicator.setState({ state: StatusBarState.LOGGED_NOT_CHOOSED_REPO });
            return;
        }
    } catch (error) {
        logError(error);
    }
}

async function fetchUserData(settings) {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await fetchUser();

            const pagination = fetchPagination(settings);
            const login = user['login'];

            const minutes = await fetchUserBillingActionsMinutes(login);
            const packages = await fetchUserBillingPackages(login);
            const sharedStorage = await fetchUserBillingSharedStorage(login);
            const starredList = await fetchUserStarred(login, pagination);
            const followers = await fetchUserFollowers(pagination);
            const following = await fetchUserFollowing(pagination);
            const repos = await fetchUserRepos(pagination);

            resolve({
                "user": user,
                "minutes": minutes,
                "packages": packages,
                "sharedStorage": sharedStorage,
                "starredList": starredList,
                "followers": followers,
                "following": following,
                "repos": repos,
            });
        } catch (error) {
            logError(error);
            resolve(null);
        }
    });
}

async function fetchRepoData(settings) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = ownerAndRepo(settings);
            const pagination = fetchPagination(settings);

            const userRepo = await fetchUserRepo(owner, repo);
            const workflows = await fetchWorkflows(owner, repo, pagination);
            const artifacts = await fetchArtifacts(owner, repo, pagination);
            const stargazers = await fetchStargazers(owner, repo, pagination);
            const runs = await fetchWorkflowRuns(owner, repo, pagination);
            const releases = await fetchReleases(owner, repo, pagination);
            const branches = await fetchBranches(owner, repo, pagination);

            resolve({
                "userRepo": userRepo,
                "workflows": workflows,
                "artifacts": artifacts,
                "stargazers": stargazers,
                "runs": runs,
                "releases": releases,
                "branches": branches,
            });
        } catch (error) {
            logError(error);
            resolve(null);
        }
    });
}

/// Assistant of githubActionsRefresh()
async function dataRefresh(settings, indicator) {
    try {
        if (indicator.isLogged == false) {
            return;
        }

        const {
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            repos,
        } = await fetchUserData(settings);

        const userObjects = [
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            repos,
        ];

        indicator.setUser(user);
        indicator.setUserBilling(minutes, packages, sharedStorage);
        indicator.setUserStarred(starredList);
        indicator.setUserFollowers(followers);
        indicator.setUserFollowing(following);
        indicator.setUserRepos(repos, (owner, repo) => {
            updateOwner(settings, owner);
            updateRepo(settings, repo);

            showNotification(`${owner}/${repo} - set as watched !`, true);

            githubActionsRefresh(settings, indicator);
            dataRefresh(settings, indicator);
        });

        if (!indicator.isCorrectState()) {
            updateTransfer(settings, userObjects);
            return;
        }

        const {
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        } = await fetchRepoData(settings);

        const repoObjects = [
            userRepo,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        ];

        updateTransfer(settings, [...userObjects, ...repoObjects]);

        indicator.setWatchedRepo(userRepo);
        indicator.setWorkflows(workflows['workflows']);
        indicator.setArtifacts(artifacts['artifacts']);
        indicator.setStargazers(stargazers);
        indicator.setWorkflowRuns({
            runs: runs['workflow_runs'],
            onDeleteWorkflow: async (runId, runName) => await removeWorkflowRun(settings, indicator, runId, runName),
        });
        indicator.setReleases(releases);
        indicator.setBranches(branches);
    } catch (error) {
        logError(error);
    }
}

async function githubActionsRefresh(settings, indicator) {
    try {
        const _isLogged = await isLogged();
        if (_isLogged == false) {
            return;
        }

        indicator.refreshTransfer(settings);

        if (!isRepositoryEntered(settings)) {
            return;
        }

        const { owner, repo } = ownerAndRepo(settings);
        const run = await fetchWorkflowRuns(owner, repo, 1);
        if (run == null) {
            indicator.setState({ state: StatusBarState.INCORRECT_REPOSITORY });
            return;
        }

        updatePackageSize(settings, run['_size_']);

        const runs = run['workflow_runs'];
        if (runs.length == 0) {
            indicator.setState({ state: StatusBarState.REPO_WITHOUT_ACTIONS });
            return;
        }

        indicator.setState({ state: StatusBarState.COMPLETED_SUCCESS });
        const previousState = indicator.label.text;
        indicator.setLatestWorkflowRun(runs[0]);
        const currentState = indicator.label.text;

        /// Notification
        if (indicator.shouldShowCompletedNotification(previousState, currentState)) {
            const ownerAndRepo = indicator.repositoryMenuItem.label.text;

            if (currentState === 'COMPLETED SUCCESS') {
                showNotification(ownerAndRepo + ' - The workflow has been successfully built', true);
            } else if (currentState === 'COMPLETED FAILURE') {
                showNotification(description + ' - Failed :/', false);
            }
        }
    } catch (error) {
        logError(error);
    }
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github-actions');

        this.settings.connect('changed::refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing();
        });

        this.settings.connect('changed::full-refresh-time', (settings, key) => {
            this.stopRefreshing();
            this.startRefreshing();
        });

        this.settings.connect('changed::simple-mode', (settings, key) => {
            const simpleMode = fetchSimpleMode(settings);
            this.indicator.setSimpleMode(simpleMode);
        });

        this.settings.connect('changed::colored-mode', (settings, key) => {
            const coloredMode = fetchColoredMode(settings);
            this.indicator.setColoredMode(coloredMode);
        });

        this.initIndicator();
    }

    disable() {
        this.stopRefreshing();
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
        this.settings = null;
    }

    async initIndicator() {
        try {
            const _isInstalledCli = await isInstalledCli();
            const _isLogged = await isLogged();
            const simpleMode = fetchSimpleMode(this.settings);
            const coloredMode = fetchColoredMode(this.settings);

            this.indicator = new StatusBarIndicator({
                simpleMode: simpleMode,
                coloredMode: coloredMode,
                isInstalledCli: _isInstalledCli,
                isLogged: _isLogged,
                refreshCallback: () => {
                    this.refresh();
                },
                logoutCallback: async () => {
                    const status = await logout();

                    if (status == true) {
                        indicator.setState({ state: StatusBarState.NOT_LOGGED });
                    }
                },
                downloadArtifactCallback: (downloadUrl, filename) => {
                    downloadArtifact(downloadUrl, filename).then(success => {
                        try {
                            if (success === true) {
                                showNotification('The artifact has been downloaded, check your home directory.' + '\n\n' + filename, true);
                            } else {
                                showNotification('Something went wrong :/', false);
                            }
                        } catch (e) {
                            logError(e);
                        }
                    });
                },
            });
            Main.panel.addToStatusArea(this._uuid, this.indicator);
            this.startRefreshing();
        } catch (error) {
            logError(error);
        }
    }

    async startRefreshing() {
        try {
            const stateRefreshTime = 1 * 1000;
            const githubActionsRefreshTime = fetchRefreshTime(this.settings) * 1000;
            const dataRefreshTime = fetchRefreshFullUpdateTime(this.settings) * 60 * 1000;

            this.stateRefreshInterval = setInterval(
                () => stateRefresh(this.settings, this.indicator),
                stateRefreshTime,
            );

            this.githubActionsRefreshInterval = setInterval(
                () => githubActionsRefresh(this.settings, this.indicator),
                githubActionsRefreshTime,
            );

            this.dataRefreshInterval = setInterval(
                () => dataRefresh(this.settings, this.indicator),
                dataRefreshTime,
            );
        } catch (error) {
            logError(error);
        }
    }

    stopRefreshing() {
        clearInterval(this.stateRefreshInterval);
        this.stateRefreshInterval = null;

        clearInterval(this.githubActionsRefreshInterval);
        this.githubActionsRefreshInterval = null;

        clearInterval(this.dataRefreshInterval);
        this.dataRefreshInterval = null;
    }

    async refresh() {
        try {
            stateRefresh(this.settings, this.indicator);
            githubActionsRefresh(this.settings, this.indicator);
            dataRefresh(this.settings, this.indicator);
        } catch (error) {
            logError(error);
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
