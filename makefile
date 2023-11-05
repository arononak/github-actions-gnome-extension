EXTENSION_DIRECTORY := $(HOME)/.local/share/gnome-shell/extensions/github-actions@arononak.github.io
GIT_TAG := $(shell git describe --tags --abbrev=0)

run:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1600x1200 \
	dbus-run-session -- gnome-shell --nested --wayland

build:
	@echo 'export const VERSION = "$(GIT_TAG)"' > github-actions@arononak.github.io/lib/version.js
	cd github-actions@arononak.github.io &&\
	glib-compile-schemas schemas/ &&\
	gnome-extensions pack\
		--out-dir=../\
		--force\
		--extra-source=assets\
		--extra-source=lib

copy:
	rm -r -f ./github-actions@arononak.github.io
	cp -r "$(EXTENSION_DIRECTORY)" ./

compile:
	glib-compile-schemas "$(EXTENSION_DIRECTORY)/schemas/"
	
lint:
	eslint -c ./.lint/.eslintrc.yml github-actions@arononak.github.io/

