#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
BRANCH="${1:-master}"

cd "$ROOT_DIR"

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  elif command -v nodejs >/dev/null 2>&1; then
    NODE_BIN="$(command -v nodejs)"
  else
    NODE_BIN="$(find "$HOME/.nvm/versions/node" -maxdepth 3 -type f -name node 2>/dev/null | sort | tail -n 1)"
  fi
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Node.js not found. Set NODE_BIN or ensure node is in PATH." >&2
  exit 1
fi

"$NODE_BIN" ./scripts/render-static.mjs

docker compose -f compose.yml -f compose.ssl.yml up -d --build api
docker compose -f compose.yml -f compose.ssl.yml up -d --force-recreate \
  web web-mini web-matchmaker web-admin \
  web-ssl web-mini-ssl web-matchmaker-ssl web-admin-ssl

docker compose -f compose.yml -f compose.ssl.yml ps
