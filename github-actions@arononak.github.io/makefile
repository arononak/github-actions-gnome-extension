run:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1600x1200 \
	dbus-run-session -- gnome-shell --nested --wayland

build:
	chmod +x create_version_file.sh
	./create_version_file.sh

	gnome-extensions pack --force --extra-source=github_white.svg --extra-source=github_gray.svg --extra-source=github_red.svg --extra-source=utils.js --extra-source=data_repository.js --extra-source=local_cli_data_repository.js --extra-source=version.js
