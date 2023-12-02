#!/bin/sh

export DOCKER_BUILDKIT=1
docker build . --target ts-check &&
docker build . --target ts-lint &&
# Uncomment this line after lint findings are addressed.
#docker build . --target go-lint &&
docker build . --target bin $1
