#!/usr/bin/env bash
# Deploy all apps to Railway via Docker
# Usage: bash scripts/railway-deploy-all.sh
set -euo pipefail

APPS=("hashmyth" "polymyths" "hyperkaon" "hypertian" "hypermyths" "hermes-worker")

for app in "${APPS[@]}"; do
  echo "=== Deploying $app to Railway ==="
  
  if [ "$app" = "hermes-worker" ]; then
    dir="services/hermes-worker"
  else
    dir="apps/$app"
  fi
  
  if [ -f "$dir/railway.json" ]; then
    (cd "$dir" && railway up --detach) || echo "WARNING: $app deploy failed, continuing..."
  else
    echo "SKIP: No railway.json found for $app"
  fi
  
  echo ""
done

echo "=== All deployments triggered ==="
echo "Check status: railway status"
