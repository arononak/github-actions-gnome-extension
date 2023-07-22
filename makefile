run:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1600x1200 \
	dbus-run-session -- gnome-shell --nested --wayland

GIT_TAG := $(shell git describe --tags --abbrev=0)
build:
	@echo 'var VERSION = "$(GIT_TAG)";' > github-actions@arononak.github.io/version.js
	cd github-actions@arononak.github.io &&\
	glib-compile-schemas schemas/ &&\
	gnome-extensions pack\
		--out-dir=../\
		--force\
		--extra-source=assets\
		--extra-source=utils.js\
		--extra-source=status_bar_indicator.js\
		--extra-source=data_repository.js\
		--extra-source=local_cli_interface.js\
		--extra-source=widgets.js\
		--extra-source=version.js
