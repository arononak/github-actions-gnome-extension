import {
    isEmpty as _isEmpty,
    openUrl as _openUrl,
    openExtensionGithubIssuesPage as _openExtensionGithubIssuesPage,
} from './utils.js'

export function isEmpty(str) { return _isEmpty(str) }

export function openUrl(str) { return _openUrl(str) }

export function openExtensionGithubIssuesPage(str) { return _openExtensionGithubIssuesPage(str) }