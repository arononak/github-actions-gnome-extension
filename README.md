[<img src="https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/get-it.png?raw=true" height="100" align="right">](https://extensions.gnome.org/extension/5973/github-actions/)

# Github Actions Gnome Extension 🧩

[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)

[![GitHub release](https://img.shields.io/github/v/release/arononak/github-actions-gnome-extension)](https://github.com/arononak/github-actions-gnome-extension/releases/latest)

[![Build GNOME Extension](https://github.com/arononak/github-actions-gnome-extension/actions/workflows/main.yml/badge.svg)](https://github.com/arononak/github-actions-gnome-extension/actions/workflows/main.yml)

## 🏞 Preview [MORE](./docs/SCREENSHOTS.md)

| SimpleMode OFF                                                                                        | SimpleMode ON                                                                                           |
|:-----------------------------------------------------------------------------------------------------:|:-------------------------------------------------------------------------------------------------------:|
| ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/menu_full.png?raw=true) | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/menu_simple.png?raw=true) |

## 🧮 Possible states

| State                          | Default                                                                                                                    | Colored                                                                                                                            |
|:-------------------------------|:--------------------------------------------------------------------------------------------------------------------------:|:----------------------------------------------------------------------------------------------------------------------------------:|
| NOT_INSTALLED_CLI              | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/not_installed_cli.png?raw=true)       | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/not_installed_cli_colored.png?raw=true)       |
| NOT_LOGGED                     | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/not_logged.png?raw=true)              | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/not_logged_colored.png?raw=true)              |
| LOGGED_NO_INTERNET_CONNECTION  | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/no_internet_connection.png?raw=true)  | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/no_internet_connection_colored.png?raw=true)  |
| LOADING                        | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/loading.png?raw=true)                 | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/loading_colored.png?raw=true)                 |
| LOGGED_NOT_CHOOSED_REPO        | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/no_repo_entered.png?raw=true)         | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/no_repo_entered_colored.png?raw=true)         |
| INCORRECT_REPOSITORY           | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/incorrect_repo.png?raw=true)          | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/incorrect_repo.png?raw=true)                  |
| REPO_WITHOUT_ACTIONS           | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/repo_without_actions.png?raw=true)    | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/repo_without_actions_colored.png?raw=true)    |
| IN_PROGRESS                    | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/in_progress.png?raw=true)             | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/in_progress_colored.png?raw=true)             |
| COMPLETED_CANCELLED            | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/cancelled.png?raw=true)               | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/cancelled_colored.png?raw=true)               |
| COMPLETED_FAILURE              | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/failure.png?raw=true)                 | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/failure_colored.png?raw=true)                 |
| COMPLETED_SUCCESS              | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/success.png?raw=true)                 | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/status/success_colored.png?raw=true)                 |

## [🔨 Installation](https://github.com/cli/cli/blob/trunk/docs/install_linux.md) and Configuration

| Steps                | Commands                                      |
|:---------------------|:----------------------------------------------|
| 🔒 Login             | `gh auth login --scopes user,repo,workflow`   |
| 🔓 Check scopes      | `gh auth status`                              |
| 🔄 If any is missing | `gh auth refresh --scopes user,repo,workflow` |

## [✅️ TODO](./docs/TODO.md) list

> **Note**<br>
> If you have any feedback, please contact me at arononak@gmail.com

## 🛠 Development

```mermaid
graph TD;
    local_cli_interface.js-->github_api_repository.js;
    github_api_repository.js-->extension_data_controller.js;
    widgets.js-->status_bar_indicator.js;
    widgets.js-->notification_controller.js;
    notification_controller.js-->extension.js;
    status_bar_indicator.js-->extension.js;
    settings_repository.js-->extension_data_controller.js;
    extension_data_controller.js-->extension.js;
    utils.js-->status_bar_indicator.js;
    utils.js-->settings_repository.js;
    settings_repository.js-->prefs_data_controller.js;
    utils.js-->prefs_data_controller.js;
    prefs_data_controller.js-->prefs.js

    version.js[version.js - Generated by makefile]-->prefs.js;

    extension.js-->EXTENSION[GNOME EXTENSION]
    prefs.js-->EXTENSION[GNOME EXTENSION]
    metadata.json-->EXTENSION[GNOME EXTENSION]
    stylesheet.css-->EXTENSION[GNOME EXTENSION]
```

| Steps                                    | Commands     |
|:-----------------------------------------|:-------------|
| ▶️ Start a gnome session in a window     | `make run`   |
| ➡️ Copying the extension from the system | `make copy`  |
| 🔨 Build gnome-extensions package        | `make build` |

## 📝 © 2023 Aron Onak

> **Warning**<br>
> The GitHub logo is a trademark of Microsoft.<br>
> This extension is not affiliated, funded, or in any way associated with Microsoft and GitHub.

