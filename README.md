[<img src="https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/get-it.png?raw=true" height="100" align="right">](https://extensions.gnome.org/extension/5973/github-actions/)

# Github Actions Gnome Extension 🧩

[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)
[![GitHub release](https://img.shields.io/github/v/release/arononak/github-actions-gnome-extension)](https://github.com/arononak/github-actions-gnome-extension/releases/latest)
[![Build GNOME Extension](https://github.com/arononak/github-actions-gnome-extension/actions/workflows/main.yml/badge.svg)](https://github.com/arononak/github-actions-gnome-extension/actions/workflows/main.yml)

## 🏞 Preview [MORE](./docs/SCREENSHOTS.md)

| SimpleMode - OFF                                                                                                 | SimpleMode - ON                                                                                                 |
|:----------------------------------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------------------------------------:|
| ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/menu_full.png?raw=true)            | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/menu_simple.png?raw=true)         |
| Quick Settings - Light                                                                                           | Quick Settings - Dark                                                                                           |
| ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/quick_settings_light.png?raw=true) | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/quick_settings_dark.png?raw=true) |

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
    utils.js-->utils_extension.js
    utils_extension.js-->github_api_repository.js
    local_cli_interface.js-->github_api_repository.js
    token_scopes.js-->github_api_repository.js
    settings_repository.js-->extension_controller.js
    github_api_repository.js-->extension_controller.js
    widgets.js-->status_bar_indicator.js
    widgets.js-->notification_controller.js
    notification_controller.js-->extension.js
    status_bar_indicator.js-->extension.js
    quick_settings_controller.js-->extension.js
    widgets.js-->quick_settings_controller.js
    extension_controller.js-->extension.js
    utils.js-->settings_repository.js
    settings_repository.js-->prefs_controller.js
    utils.js-->utils_prefs.js;
    utils_prefs.js-->prefs_controller.js;
    prefs_controller.js-->prefs.js
    utils_extension.js-->widgets.js
    utils_extension.js-->quick_settings_controller.js
    utils_extension.js-->status_bar_indicator.js
    utils_extension.js-->notification_controller.js
    settings_repository.js-->notification_controller.js

    version.js[version.js - Generated by makefile]-->prefs_controller.js;

    extension.js-->EXTENSION[GNOME EXTENSION]
    prefs.js-->EXTENSION[GNOME EXTENSION]
    metadata.json-->EXTENSION[GNOME EXTENSION]
    stylesheet.css-->EXTENSION[GNOME EXTENSION]
```

| Steps                                       | Commands       |
|:--------------------------------------------|:---------------|
| ▶️ Start a gnome session in a window        | `make run`     |
| ➡️ Copying the extension from the system.   | `make copy`    |
| 🔄 Compile schemas                          | `make compile` |
| 🔨 Build gnome-extensions package           | `make build`   |
| [🦍 TESTING STEPS](./docs/TESTING_STEPS.md) |                |

## 📝 © 2023 Aron Onak

> **Warning**<br>
> The GitHub logo is a trademark of Microsoft.<br>
> This extension is not affiliated, funded, or in any way associated with Microsoft and GitHub.

