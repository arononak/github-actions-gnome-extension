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

const statusBarIndicator = Me.imports.status_bar_indicator;
const repository = Me.imports.data_repository;
const utils = Me.imports.utils;
const widgets = Me.imports.widgets;

const StatusBarIndicator = GObject.registerClass(statusBarIndicator.StatusBarIndicator);

function updateTransfer(settings, jsonObjects) {
    const sizeInBytes = jsonObjects
        .filter(e => e != null)
        .reduce((sum, object) => sum + object._size_, 0);

    utils.updateColdPackageSize(settings, sizeInBytes);
}

async function removeWorkflowRun(settings, indicator, runId) {
    try {
        const { owner, repo } = utils.ownerAndRepo(settings);
        const status = await repository.deleteWorkflowRun(owner, repo, runId);

        if (status == 'success') {
            await dataRefresh(settings, indicator);
            utils.showNotification('The Workflow run was successfully deleted', true);
        } else {
            utils.showNotification('Something went wrong :/', false);
        }
    } catch (error) {
        logError(error);
    }
}

async function stateRefresh(settings, indicator) {
    try {
        indicator.refreshBoredIcon();

        const isLogged = await repository.isLogged();
        if (isLogged == false) {
            indicator.setStateNotLogged();
            return;
        }

        if (!utils.isRepositoryEntered(settings)) {
            indicator.setStateLoggedNotChoosedRepo();
            return;
        }
    } catch (error) {
        logError(error);
    }
}

async function fetchUserData(settings, repository) {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await repository.fetchUser();

            const pagination = utils.pagination(settings);
            const login = user['login'];

            const minutes = await repository.fetchUserBillingActionsMinutes(login);
            const packages = await repository.fetchUserBillingPackages(login);
            const sharedStorage = await repository.fetchUserBillingSharedStorage(login);
            const starredList = await repository.fetchUserStarred(login, pagination);
            const followers = await repository.fetchUserFollowers(pagination);
            const following = await repository.fetchUserFollowing(pagination);

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

async function fetchRepoData(settings, repository) {
    return new Promise(async (resolve, reject) => {
        try {
            const { owner, repo } = utils.ownerAndRepo(settings);
            const pagination = utils.pagination(settings);

            const workflows = await repository.fetchWorkflows(owner, repo, pagination);
            const artifacts = await repository.fetchArtifacts(owner, repo, pagination);
            const stargazers = await repository.fetchStargazers(owner, repo, pagination);
            const runs = await repository.fetchWorkflowRuns(owner, repo, pagination);
            const releases = await repository.fetchReleases(owner, repo, pagination);

            resolve({
                "workflows": workflows,
                "artifacts": artifacts,
                "stargazers": stargazers,
                "runs": runs,
                "releases": releases
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
            following
        } = await fetchUserData(settings, repository);

        const userObjects = [
            user,
            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following
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
            releases
        } = await fetchRepoData(settings, repository);

        const repoObjects = [
            workflows,
            artifacts,
            stargazers,
            runs,
            releases
        ];

        updateTransfer(settings, [...userObjects, ...repoObjects]);

        indicator.setWorkflows(workflows['workflows']);
        indicator.setArtifacts(artifacts['artifacts']);
        indicator.setStargazers(stargazers);
        indicator.setWorkflowRuns({
            runs: runs['workflow_runs'],
            onDeleteWorkflow: async (runId) => await removeWorkflowRun(settings, indicator, runId),
        });
        indicator.setReleases(releases);
    } catch (error) {
        logError(error);
    }
}

async function githubActionsRefresh(settings, indicator) {
    try {
        const isLogged = await repository.isLogged();
        if (isLogged == false) {
            return;
        }

        indicator.refreshTransfer(settings);

        if (!utils.isRepositoryEntered(settings)) {
            return;
        }

        const { owner, repo } = utils.ownerAndRepo(settings);
        const run = await repository.fetchWorkflowRuns(owner, repo, 1);
        if (run == null) {
            indicator.setStateIncorrectRepository();
            return;
        }

        indicator.setStateCorrect();

        utils.updatePackageSize(settings, run['_size_']);

        const previousState = indicator.label.text;
        indicator.setLatestWorkflowRun(run['workflow_runs'][0]);
        const currentState = indicator.label.text;

        /// Notification
        if (indicator.shouldShowCompletedNotification(previousState, currentState)) {
            const ownerAndRepo = indicator.repositoryMenuItem.label.text;

            if (currentState === 'COMPLETED SUCCESS') {
                widgets.showFinishNotification(ownerAndRepo, true);
            } else if (currentState === 'COMPLETED FAILURE') {
                widgets.showFinishNotification(ownerAndRepo, false);
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
            const isLogged = await repository.isLogged();
            this.indicator = new StatusBarIndicator(isLogged, () => this.refresh());
            Main.panel.addToStatusArea(this._uuid, this.indicator);
            this.startRefreshing();
        } catch (error) {
            logError(error);
        }
    }

    async startRefreshing() {
        try {
            await this.refresh();

            this.stateRefreshInterval = setInterval(() => stateRefresh(this.settings, this.indicator), 1000);

            const githubActionsRefreshTime = this.settings.get_int('refresh-time') * 1000;
            const dataRefreshTime = this.settings.get_int('full-refresh-time') * 60 * 1000;

            this.githubActionsRefreshInterval = setInterval(() => githubActionsRefresh(this.settings, this.indicator), githubActionsRefreshTime);
            this.dataRefreshInterval = setInterval(() => dataRefresh(this.settings, this.indicator), dataRefreshTime);
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
            dataRefresh(this.settings, this.indicator);
            githubActionsRefresh(this.settings, this.indicator);
        } catch (error) {
            logError(error);
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
