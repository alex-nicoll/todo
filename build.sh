#!/bin/sh

export DOCKER_BUILDKIT=1
docker build . --target js-lint &&
# Uncomment this line after lint findings are addressed.
#docker build . --target go-lint &&
docker build . --target bin -t $1
