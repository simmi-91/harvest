#!/bin/bash
set -euo pipefail

HARVEST_DIR="/var/www/harvest"
DEPLOY_USER="${1:-}"

cd "$HARVEST_DIR"

if [ ! -d "app_old" ]; then
  echo "Error: app_old does not exist — nothing to roll back to."
  exit 1
fi

echo "Rolling back..."

[ -d "app_bad" ] && rm -rf app_bad
mv app app_bad
mv app_old app

if [ -n "$DEPLOY_USER" ]; then
  sudo -u "$DEPLOY_USER" pm2 restart harvest \
    || sudo -u "$DEPLOY_USER" pm2 start npm --name harvest --cwd "$HARVEST_DIR/app" -- start -- -p 8030
else
  pm2 restart harvest \
    || pm2 start npm --name harvest --cwd "$HARVEST_DIR/app" -- start -- -p 8030
fi

echo "Rollback complete. Failed version saved as app_bad."
echo "Remove it when satisfied: rm -rf $HARVEST_DIR/app_bad"
