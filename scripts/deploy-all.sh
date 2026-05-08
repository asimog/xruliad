#!/usr/bin/env bash
set -euo pipefail

echo "=== HyperMyths Monorepo Multi-App Deploy Script ==="
echo "Apps: hypermyths, hashmyth, polymyths, hyperkaon, hypertian"
echo "Worker: hermes-worker (Railway)"
echo ""

# ── 1. Build all apps locally ──
echo "[1/6] Building all apps..."
pnpm build || { echo "Build failed"; exit 1; }

# ── 2. Deploy hypermyths (hypermyths.com) ──
echo "[2/6] Deploying hypermyths to Vercel..."
cd apps/hypermyths
vercel --prod --yes
cd ../..

# ── 3. Deploy hashmyth (hashmyth.com) ──
echo "[3/6] Deploying hashmyth to Vercel..."
cd apps/hashmyth
vercel --prod --yes
cd ../..

# ── 4. Deploy polymyths (polymyths.com) ──
echo "[4/6] Deploying polymyths to Vercel..."
cd apps/polymyths
vercel --prod --yes
cd ../..

# ── 5. Deploy hyperkaon (hyperkaon.com) ──
echo "[5/6] Deploying hyperkaon to Vercel..."
cd apps/hyperkaon
vercel --prod --yes
cd ../..

# ── 6. Deploy hypertian (hypertian.com) ──
echo "[6/6] Deploying hypertian to Vercel..."
cd apps/hypertian
vercel --prod --yes
cd ../..

echo ""
echo "=== All Vercel apps deployed! ==="
echo ""
echo "Next: Deploy hermes-worker to Railway:"
echo "  cd services/hermes-worker && railway up"
