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
    updateColdPackageSize,
    updatePackageSize,
    isRepositoryEntered,
    ownerAndRepo,
    pagination,
    simpleMode,
    coloredMode,
} = Me.imports.utils;

const {
    showNotification,
    showFinishNotification,
} = Me.imports.widgets;

const {
    isInstalledCli,
    isLogged,
    fetchUser,
    fetchUserBillingActionsMinutes,
    fetchUserBillingPackages,
    fetchUserBillingSharedStorage,
    fetchUserStarred,
    fetchUserFollowers,
    fetchUserFollowing,
    fetchWorkflows,
    fetchArtifacts,
    fetchStargazers,
    fetchWorkflowRuns,
    deleteWorkflowRun,
    fetchReleases,
    fetchBranches,
} = Me.imports.data_repository;

const statusBarIndicator = Me.imports.status_bar_indicator;
const StatusBarState = Me.imports.status_bar_indicator.StatusBarState;

const StatusBarIndicator = GObject.registerClass(statusBarIndicator.StatusBarIndicator);

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

            const _pagination = pagination(settings);
            const login = user['login'];

            const minutes = await fetchUserBillingActionsMinutes(login);
            const packages = await fetchUserBillingPackages(login);
            const sharedStorage = await fetchUserBillingSharedStorage(login);
            const starredList = await fetchUserStarred(login, _pagination);
            const followers = await fetchUserFollowers(_pagination);
            const following = await fetchUserFollowing(_pagination);

            resolve({
                "user": user,
                "minutes": minutes,
                "packages": packages,
                "sharedStorage": sharedStorage,
                "starredList": starredList,
                "followers": followers,
                "following": following
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
            const _pagination = pagination(settings);

            const workflows = await fetchWorkflows(owner, repo, _pagination);
            const artifacts = await fetchArtifacts(owner, repo, _pagination);
            const stargazers = await fetchStargazers(owner, repo, _pagination);
            const runs = await fetchWorkflowRuns(owner, repo, _pagination);
            const releases = await fetchReleases(owner, repo, _pagination);
            const branches = await fetchBranches(owner, repo, _pagination);

            resolve({
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
        } = await fetchUserData(settings);

        const userObjects = [
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
        ];

        indicator.setUser(user);
        indicator.setUserBilling(minutes, packages, sharedStorage);
        indicator.setUserStarred(starredList);
        indicator.setUserFollowers(followers);
        indicator.setUserFollowing(following);

        if (!indicator.isCorrectState()) {
            updateTransfer(settings, userObjects);
            return;
        }

        const {
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        } = await fetchRepoData(settings);

        const repoObjects = [
            workflows,
            artifacts,
            stargazers,
            runs,
            releases,
            branches,
        ];

        updateTransfer(settings, [...userObjects, ...repoObjects]);

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

        indicator.setState({ state: StatusBarState.COMPLETED_SUCCESS });

        updatePackageSize(settings, run['_size_']);

        const previousState = indicator.label.text;
        indicator.setLatestWorkflowRun(run['workflow_runs'][0]);
        const currentState = indicator.label.text;

        /// Notification
        if (indicator.shouldShowCompletedNotification(previousState, currentState)) {
            const ownerAndRepo = indicator.repositoryMenuItem.label.text;

            if (currentState === 'COMPLETED SUCCESS') {
                showFinishNotification(ownerAndRepo, true);
            } else if (currentState === 'COMPLETED FAILURE') {
                showFinishNotification(ownerAndRepo, false);
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
            const _simpleMode = simpleMode(settings);
            this.indicator.setSimpleMode(_simpleMode);
        });

        this.settings.connect('changed::colored-mode', (settings, key) => {
            const _coloredMode = coloredMode(settings);
            this.indicator.setColoredMode(_coloredMode);
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
            const _simpleMode = simpleMode(this.settings);
            const _coloredMode = coloredMode(this.settings);

            this.indicator = new StatusBarIndicator({
                simpleMode: _simpleMode,
                coloredMode: _coloredMode,
                isInstalledCli: _isInstalledCli,
                isLogged: _isLogged,
                refreshCallback: () => this.refresh(),
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
            const githubActionsRefreshTime = this.settings.get_int('refresh-time') * 1000;
            const dataRefreshTime = this.settings.get_int('full-refresh-time') * 60 * 1000;

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
