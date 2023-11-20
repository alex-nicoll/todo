#!/bin/sh

SCRIPT_PATH=$(dirname $(realpath $0))
TAG=$1
if [ -z $TAG ]; then
  TAG='todo:latest'
fi
"$SCRIPT_PATH"/build.sh $TAG &&
docker run -it --rm \
  -p 8080:8080 \
  -e "JWT_SIGNING_KEY=$JWT_SIGNING_KEY" \
  -e "DB_URL=$DB_URL" \
  $TAG
