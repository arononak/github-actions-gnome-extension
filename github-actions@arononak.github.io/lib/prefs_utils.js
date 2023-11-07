import {
    isEmpty as _isEmpty,
    openUrl as _openUrl,
    openExtensionGithubIssuesPage as _openExtensionGithubIssuesPage,
} from './utils.js'

export function isEmpty(str)                    { return _isEmpty(str) }
export function openUrl(url)                    { return _openUrl(url) }
export function openExtensionGithubIssuesPage() { return _openExtensionGithubIssuesPage() }