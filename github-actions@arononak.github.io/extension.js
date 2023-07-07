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

const { Clutter, GObject, St, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const GETTEXT_DOMAIN = 'github-actions-extension';
const Me = ExtensionUtils.getCurrentExtension();

const utils = Me.imports.utils;
const statusBarIndicator = Me.imports.status_bar_indicator;
const repository = Me.imports.data_repository;

const StatusBarIndicator = GObject.registerClass(statusBarIndicator.StatusBarIndicator);

function showFinishNotification(ownerAndRepo, success) {
    const description = ownerAndRepo + (success === true ? ' - Succeeded' : ' - Failed :/');
    utils.showNotification(description, success);
}

/// 1-60 minutes
async function coldRefresh(settings, indicator) {
    try {
        if (indicator.isLogged == false) {
            return;
        }

        if (!utils.isRepositorySelected(settings)) {
            return;
        }

        const user = await repository.fetchUser();
        if (user == null) {
            return;
        }

        const login = user['login'];

        const pagination = utils.pagination(settings);
        const { owner, repo } = utils.ownerAndRepo(settings);

        const minutes = await repository.fetchUserBillingActionsMinutes(login);
        const packages = await repository.fetchUserBillingPackages(login);
        const sharedStorage = await repository.fetchUserBillingSharedStorage(login);
        const starredList = await repository.fetchUserStarred(login, pagination);
        const followers = await repository.fetchUserFollowers(pagination);
        const following = await repository.fetchUserFollowing(pagination);
        const workflows = await repository.fetchWorkflows(owner, repo, pagination);
        const artifacts = await repository.fetchArtifacts(owner, repo, pagination);
        const stargazers = await repository.fetchStargazers(owner, repo, pagination);
        const runs = await repository.fetchWorkflowRuns(owner, repo, pagination);
        const releases = await repository.fetchReleases(owner, repo, pagination);

        const allDataObjects = [
            user,

            minutes,
            packages,
            sharedStorage,
            starredList,
            followers,
            following,
            workflows,
            artifacts,
            stargazers,
            runs,
            releases
        ];

        const sizeInBytes = allDataObjects.filter(e => e != null).reduce((sum, object) => sum + object._size_, 0);

        utils.updateColdPackageSize(settings, sizeInBytes);

        indicator.setUser(user);
        indicator.setUserBilling(minutes, packages, sharedStorage);
        indicator.setUserStarred(starredList);
        indicator.setUserFollowers(followers);
        indicator.setUserFollowing(following);
        indicator.setWorkflows(workflows['workflows']);
        indicator.setArtifacts(artifacts['artifacts']);
        indicator.setStargazers(stargazers);
        indicator.setRuns(runs['workflow_runs'], async (runId) => {
            const status = await repository.deleteWorkflowRun(owner, repo, runId);
            if (status == 'success') {
                await coldRefresh(settings, indicator);
                utils.showNotification('The Workflow run was successfully deleted', true);
            } else {
                utils.showNotification('Something went wrong :/', false);
            }
        });
        indicator.setReleases(releases);
    } catch (error) {
        logError(error);
    }
}

/// 1-60sec
async function hotRefresh(settings, indicator) {
    try {
        if (indicator.isLogged == false) {
            return;
        }

        if (!utils.isRepositorySelected(settings)) {
            return;
        }

        const { owner, repo } = utils.ownerAndRepo(settings);
        const run = await repository.fetchWorkflowRuns(owner, repo, 1);
        if (run == null) {
            return;
        }

        utils.updatePackageSize(settings, run['_size_']);

        const previousState = indicator.label.text;
        indicator.setLatestRun(run['workflow_runs'][0]);
        const currentState = indicator.label.text;

        indicator.refreshTransfer(settings, indicator.isLogged);
        indicator.refreshBoredIcon();

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

        this.indicator = new StatusBarIndicator(() => this.refresh());
        Main.panel.addToStatusArea(this._uuid, this.indicator);
        this.startRefreshing();
    }

    disable() {
        this.stopRefreshing();
        this.indicator.destroy();
        this.indicator.menu = null;
        this.indicator = null;
        this.settings = null;
    }

    async startRefreshing() {
        await this.refresh();

        const statusRefreshTime = this.settings.get_int('refresh-time') * 1000;
        const fullStatusRefreshTime = this.settings.get_int('full-refresh-time') * 60 * 1000;

        this.hotRefreshInterval = setInterval(() => hotRefresh(this.settings, this.indicator), statusRefreshTime);
        this.coldRefreshInterval = setInterval(() => coldRefresh(this.settings, this.indicator), fullStatusRefreshTime);
    }

    stopRefreshing() {
        clearInterval(this.hotRefreshInterval);
        this.hotRefreshInterval = null;

        clearInterval(this.coldRefreshInterval);
        this.coldRefreshInterval = null;
    }

    async refresh() {
        const isLogged = await repository.isLogged();
        this.indicator.refreshAuthState(isLogged);

        coldRefresh(this.settings, this.indicator);
        hotRefresh(this.settings, this.indicator);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
