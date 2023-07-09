#!/bin/bash

tag=$(git describe --abbrev=0 --tags)

echo "var VERSION = '${tag}';" > github-actions@arononak.github.io/version.js
