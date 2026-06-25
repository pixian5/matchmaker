#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
BRANCH="${1:-master}"

cd "$ROOT_DIR"

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

node ./scripts/render-static.mjs

docker compose -f compose.yml -f compose.ssl.yml up -d --build api
docker compose -f compose.yml -f compose.ssl.yml up -d --force-recreate \
  web web-mini web-matchmaker web-admin \
  web-ssl web-mini-ssl web-matchmaker-ssl web-admin-ssl

docker compose -f compose.yml -f compose.ssl.yml ps
