[<img src="https://github.com/arononak/github-actions-gnome-extension/blob/12c985b40d027f1f455199bb3c134bf209008de5/get-it.png" height="100" align="right">](https://extensions.gnome.org/extension/5973/github-actions/)

# Github Actions Gnome Extension 🧩

[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)
[![GitHub release](https://img.shields.io/github/v/release/arononak/github-actions-gnome-extension)](https://github.com/arononak/github-actions-gnome-extension/releases/latest)

### Preview

![alt text](https://github.com/arononak/github-actions-gnome-extension/blob/a4fdd9b5259eb1631181fc06dd5407b7ee7d2844/preview.png)

### Installation

Ubuntu
```bash
sudo apt update
sudo apt install gh
```
[https://github.com/cli/cli/blob/trunk/docs/install_linux.md](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)

### Login

```bash
gh auth login
```

and configure owner and repository in extension settings.

### Build gnome-extensions pack

```bash
cd github-actions@arononak.github.io
gnome-extensions pack --extra-source=github.svg
```

### Feedback
if you have any feedback, please contact me at arononak@gmail.com

### Disclaimer
This extension is not affiliated, funded, or in any way associated with Microsoft and GitHub.


