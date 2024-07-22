[<img src="https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/get-it.png?raw=true" height="100" align="right">](https://extensions.gnome.org/extension/5973/github-actions/)

# GitHub Actions Gnome Extension 🧩

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/arononak/github-actions-gnome-extension/.github%2Fworkflows%2Fmain.yml?labelColor=orange&color=white)
[![Commits](https://img.shields.io/github/commit-activity/m/arononak/github-actions-gnome-extension?labelColor=blue&color=white)](https://github.com/arononak/github-actions-gnome-extension/graphs/contributors)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/arononak/github-actions-gnome-extension?labelColor=yellow&color=white)
![Static Badge](https://img.shields.io/badge/Give_me-STAR!-blue?labelColor=fushia&color=aqua)

<details>
<summary>Table of Contents</summary>

- [GitHub Actions Gnome Extension 🧩 MORE](#github-actions-gnome-extension--more)
- [🏞 Preview](#-preview)
- [🔨 Installation](#-installation)
- [🖥️ Development](#️-development)
- [📝 License](#-license)

</details>

# [🏞 Preview](./docs/SCREENSHOTS.md)

| Default                                                                                                          | Simple mode                                                                                                     |
|:----------------------------------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------------------------------------:|
| ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/menu_full.png?raw=true)            | ![](https://github.com/arononak/github-actions-gnome-extension/blob/main/docs/menu_simple.png?raw=true)         |

# [🔨 Installation](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)

| Steps                | Commands                                      |
|:---------------------|:----------------------------------------------|
| 🔒 Login             | `gh auth login --scopes user,repo,workflow`   |
| 🔓 Check scopes      | `gh auth status`                              |
| 🔄 If any is missing | `gh auth refresh --scopes user,repo,workflow` |

# [🖥️ Development](./docs/TODO.md)

![](https://github.com/arononak/github-actions-gnome-extension/blob/main/development.png?raw=true)

```mermaid
graph TD
    utils.js---->extension_utils.js
    utils.js---->github_service.js
    utils.js---->prefs_utils.js
    utils.js---->settings_repository.js
    extension_utils.js--->widgets.js
    settings_repository.js-->date_format_controller.js
    date_format_controller.js-->status_bar_indicator.js
    extension_utils.js-->extension_controller.js
    extension_utils.js-->status_bar_indicator.js
    extension_utils.js-->quick_settings_controller.js
    extension_utils.js-->notification_controller.js
    widgets.js-->extension_controller.js
    widgets.js-->status_bar_indicator.js
    widgets.js-->quick_settings_controller.js
    widgets.js-->notification_controller.js
    settings_repository.js-->extension_controller.js
    local_cli_interface.js-->github_service.js
    token_scopes.js-->github_service.js
    file_controller.js-->cache_repository.js
    cache_repository.js-->extension_repository.js
    github_service.js-->extension_repository.js
    extension_repository.js-->extension_controller.js
    settings_repository.js-->quick_settings_controller.js
    settings_repository.js-->notification_controller.js
    settings_repository.js-->prefs_controller.js
    version.js[version.js - Generated by makefile]-->prefs_controller.js
    prefs_utils.js-->prefs_controller.js
    prefs_controller.js-->prefs.js
    status_bar_indicator.js-->extension.js
    notification_controller.js-->extension.js
    quick_settings_controller.js-->extension.js
    extension_controller.js-->extension.js
    
    extension.js-->EXTENSION((GNOME EXTENSION))
    schemas/-->EXTENSION((GNOME EXTENSION))
    assets/-->EXTENSION((GNOME EXTENSION))
    metadata.json-->EXTENSION((GNOME EXTENSION))
    stylesheet.css-->EXTENSION((GNOME EXTENSION))
    prefs.js-->EXTENSION((GNOME EXTENSION))

    subgraph "Settings"
        version.js
        prefs.js
        prefs_controller.js
        prefs_utils.js
    end

    subgraph "Github API"
        token_scopes.js
        local_cli_interface.js
        github_service.js
    end

    subgraph "Core"
        extension.js
        extension_controller.js
        quick_settings_controller.js
        notification_controller.js
        status_bar_indicator.js
        settings_repository.js
        widgets.js
        extension_utils.js
        extension_repository.js
        date_format_controller.js
        file_controller.js
        cache_repository.js
    end
```

- ### 📜️ Development **rules**

  This project was built using **Aron Flow** (fuck scrum).

  | Before `git push`            | Before deploy                                |
  |:-----------------------------|:---------------------------------------------|
  | ✏️ `make lint-fix`            | 🏞 New screenshots                           |
  |                              | 🦍 [TESTING STEPS](./docs/TESTING_STEPS.md)  |
  |                              | 🏷️ New tag & release                         |
  |                              | 🛰 Deploy only on Fridays !                  |

- ### 📥 Cloning and running

  ```bash
  git clone https://github.com/arononak/github-actions-gnome-extension.git
  cd github-actions-gnome-extension
  make install && make run
  ```

  if the extension fails to load in the window:

  ```bash
  make install && make logout
  make install && make logout
  make logs
  ```

- ### ⌨️ Makefile commands

  | Steps                                                                | Commands                                                          |
  |:---------------------------------------------------------------------|:------------------------------------------------------------------|
  | ▶️  Starts a gnome session in a window                                | `make run`                                                        |
  | ➡️  Copying the extension from the system                             | `make copy`                                                       |
  | 🔎️ Starts code analysis                                              | `make lint`                                                       |
  | ✏️  Starts ESLint fixing                                              | `make lint-fix`                                                   |
  | 🔄 Compiles schemas                                                  | `make compile`                                                    |
  | 🛠️ Builds gnome-extensions package                                   | `make build`                                                      |
  | 📦 Builds and installs on system, gnome restart required             | `make install`                                                    |
  | 📼️ Displays logs of the current Gnome session                        | `make logs`                                                       |
  | 😴 logout                                                            | `make logout`                                                     |

# 📝 License

> [!NOTE]
> Copyright © 2024 Aron Onak. All rights reserved.<br>
> Licensed under the [GPL-3](LICENSE) license.<br>
> If you have any feedback, please contact me at arononak@gmail.com

> [!WARNING]
> The GitHub logo is a trademark of Microsoft.<br>
> This extension is not affiliated, funded, or in any way associated with Microsoft and GitHub.<br>
