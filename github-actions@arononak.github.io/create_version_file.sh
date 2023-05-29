#!/bin/bash

tag=$(git describe --abbrev=0 --tags)

echo "var VERSION = '${tag}';" > version.js
