#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
REMOTE_HOST="${REMOTE_HOST:-root@uk.sbbz.tech}"
REMOTE_KEY="${REMOTE_KEY:-$HOME/.ssh/matchmaker_uk_ed25519}"

git -C "$ROOT_DIR" push origin "$BRANCH"

ssh -i "$REMOTE_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" \
  "cd /opt/matchmaker && chmod +x deploy/remote-deploy.sh && ./deploy/remote-deploy.sh '$BRANCH'"
