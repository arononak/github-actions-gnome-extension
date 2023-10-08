run:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1600x1200 \
	dbus-run-session -- gnome-shell --nested --wayland

GIT_TAG := $(shell git describe --tags --abbrev=0)
build:
	@echo 'var VERSION = "$(GIT_TAG)";' > github-actions@arononak.github.io/lib/version.js
	cd github-actions@arononak.github.io &&\
	glib-compile-schemas schemas/ &&\
	gnome-extensions pack\
		--out-dir=../\
		--force\
		--extra-source=assets\
		--extra-source=lib

EXTENSION_DIRECTORY := $(HOME)/.local/share/gnome-shell/extensions/github-actions@arononak.github.io
copy:
	rm -r -f ./github-actions@arononak.github.io
	cp -r "$(EXTENSION_DIRECTORY)" ./
	
