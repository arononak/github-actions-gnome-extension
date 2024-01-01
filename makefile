EXTENSION_DIRECTORY := $(HOME)/.local/share/gnome-shell/extensions/github-actions@arononak.github.io
EXTENSION_PACKAGE := github-actions@arononak.github.io.shell-extension.zip
GIT_TAG := $(shell git describe --tags --abbrev=0)

run:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1600x1200 \
	dbus-run-session -- gnome-shell --nested --wayland
	gnome-extensions enable $(EXTENSION_PACKAGE)

build:
	@echo 'export const VERSION = `$(GIT_TAG)`' > github-actions@arononak.github.io/lib/version.js
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

install: build
	gnome-extensions install $(EXTENSION_PACKAGE) --force
	rm -r -f $(EXTENSION_PACKAGE)
	
start: install run

compile:
	glib-compile-schemas "github-actions@arononak.github.io/schemas/"

lint:
	eslint -c ./.lint/.eslintrc.yml github-actions@arononak.github.io/

lint-fix:
	eslint -c ./.lint/.eslintrc.yml github-actions@arononak.github.io/ --fix

logs:
	journalctl -f -o cat /usr/bin/gnome-shell

logout:
	gnome-session-quit --logout --no-prompt

