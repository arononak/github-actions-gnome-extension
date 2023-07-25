'use strict';

const extension = imports.misc.extensionUtils.getCurrentExtension();
const { removeWhiteChars, isEmpty } = extension.imports.app.utils;

var SettingsRepository = class {
    constructor(settings) {
        this.settings = settings;
    }

    fetchOwner = () => this.settings.get_string('owner');
    updateOwner = (owner) => this.settings.set_string('owner', owner);

    fetchRepo = () => this.settings.get_string('repo');
    updateRepo = (repo) => this.settings.set_string('repo', repo);

    fetchPackageSize = () => bytesToString(this.settings.get_int('package-size-in-bytes'));
    updatePackageSize = (sizeInBytes) => this.settings.set_int('package-size-in-bytes', sizeInBytes);

    fetchColdPackageSize = () => bytesToString(this.settings.get_int('cold-package-size-in-bytes'));
    updateColdPackageSize = (sizeInBytes) => this.settings.set_int('cold-package-size-in-bytes', sizeInBytes);

    fetchRefreshTime = () => this.settings.get_int('refresh-time');
    updateRefreshTime = (refreshTime) => this.settings.set_int('refresh-time', refreshTime);

    fetchRefreshFullUpdateTime = () => this.settings.get_int('full-refresh-time');
    updateFullRefreshTime = (refreshTime) => this.settings.set_int('full-refresh-time', refreshTime);

    fetchPagination = () => this.settings.get_int('pagination');
    updatePagination = (pagination) => this.settings.set_int('pagination', pagination);

    fetchSimpleMode = () => this.settings.get_boolean('simple-mode');
    fetchColoredMode = () => this.settings.get_boolean('colored-mode');
    fetchUppercaseMode = () => this.settings.get_boolean('uppercase-mode');

    ownerAndRepo() {
        const owner = this.fetchOwner(this.settings);
        const repo = this.fetchRepo(this.settings);

        return {
            owner: owner,
            repo: repo,
        };
    }

    isRepositoryEntered() {
        const { owner, repo } = this.ownerAndRepo(this.settings);

        if (isEmpty(removeWhiteChars(owner)) || isEmpty(removeWhiteChars(repo))) {
            return false;
        }

        return true;
    }
}
