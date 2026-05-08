# HyperMyths Monorepo Migration Plan

## Inventory

### HyperMyths
- Source: `C:\SessionMint\HyperMyths`
- Framework: Next.js 16 App Router, React 19, Tailwind CSS 4
- Package manager detected: npm (`package-lock.json` existed in source; not copied)
- Scripts: `dev`, `build`, `start`, `db:migrate`, `worker:*`, `video:*`, `env:check`, `secrets:scan`, `test`
- Backend/data: Prisma 7, PostgreSQL, custom outbox workers, video-service, S3-compatible storage, Privy auth, Solana helpers
- Visual/audio: `LazyCanvasLayers`, `DynamicParticleBackground`, `CentralAudioOrb`, `GlobalPlayPauseButton`, `MusicEngineProvider`, Google fonts via `next/font`
- AI/integration: OpenRouter, xAI, Fal, Replicate, HuggingFace, Eliza, pay.sh-shaped `lib/pay/*`, X, token/DexScreener helpers

### CancerHawk
- Source: `C:\SessionMint\cancerhawk`
- Framework: Next.js 16 Pages Router plus Python FastAPI/Railway worker
- Package manager detected: npm (`package-lock.json` existed in source; not copied)
- Scripts: `dev`, `prebuild`, `build`, `start`, `lint`; Python tests via `python -m pytest`
- Backend/data: `app/` FastAPI engine, `backend/` MOTO/RAG/compiler modules, generated `results/`, Railway `Procfile`
- Visual/audio: Pages `_app.tsx`, `SiteBackground`, `MusicProvider`, `GlobalMusicButton`, `GlobalBackgroundToggle`, Google fonts, local VT323 font
- AI/integration: OpenRouter, MOTO-style aggregation, MiroShark-style archetype review and analysis. Local `MiroShark/` folder is empty.

### Hypertian
- Source: `C:\SessionMint\hypertian`
- Framework: Next.js 15 App Router, React 18, Tailwind CSS 4
- Package manager detected: npm (`package-lock.json` existed in source; not copied)
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `pipeline`
- Backend/data: Supabase migrations, anonymous owner sessions, admin session, overlay heartbeat signing, Solana payment verification, Filebase uploads
- Visual/audio: `SiteBackground`, `MusicProvider`, `music-experience`, `app-shell`, lucide controls
- Product surface: creator-first livestream ads, directory, feed, overlay, music, feedback, admin

## Target Structure

The new repo uses pnpm workspaces and Turborepo:

```text
apps/
  hypermyths/
  hypertian/
  cancerhawk/
  hyperkaon/
  polymyths/
packages/
  ui theme visuals music-orb fonts auth wallet database ai agents intelligence simulation payments media markets tokens analytics config types
services/
  api video-worker ad-server synthetic-data-worker simulation-worker intelligence-worker
infra/
  vercel cloudflare docker database moto miroshark paysh
docs/
  architecture.md deployment.md ecosystem.md visual-system.md integrations.md intelligence-engine.md
```

## Migration Plan

1. Copy the three source apps into `apps/*`, excluding `.git`, `.env*`, `node_modules`, `.next`, caches, local deployment state, logs, generated secret imports, package locks, and local DB artifacts.
2. Scaffold HyperKaon and Polymyths as fresh Next.js 16 / React 19 apps using shared packages from the start.
3. Add shared package boundaries before deep extraction:
   - `packages/theme`: product metadata, tokens, domain map, nav/CTA data.
   - `packages/fonts`: CSS variable contract and font class helpers.
   - `packages/visuals`: shared ecosystem background with product variants and reduced-motion support.
   - `packages/music-orb`: opt-in audio engine, visual orb, volume/mute controls, no autoplay.
   - `packages/ui`: shell, cards, panels, buttons, product-aware primitives.
4. Preserve behavior first. Migrated apps consume shared wrappers in root layouts while retaining existing route-specific UI, auth, workers, database code, and copy.
5. Add real integration boundaries:
   - `packages/payments`: pay.sh/x402 client and spend checks. Existing `PAY_SH_*` variables are mapped to canonical `PAYSH_*`.
   - `packages/simulation`: external MiroShark client, scenario schema, result parser.
   - `packages/agents`: moto/fstack workflow specs and setup check.
6. Add shared intelligence logic in `packages/intelligence` and worker entrypoints in `services/intelligence-worker`.
7. Validate with pnpm install/build/lint/typecheck/test where secrets and external services allow.

## Risks And Manual Review

- Source worktrees were dirty; the migration copies current filesystem state without reverting source changes.
- HyperMyths has existing pay.sh code and payment-related Prisma fields; the first pass preserves those and adds shared package boundaries instead of rewriting production payment flow immediately.
- CancerHawk’s Python engine is not automatically converted into TypeScript; it remains app-owned while shared intelligence/simulation packages provide cross-product interfaces.
- React/Next versions differ. Shared packages use broad peer ranges and Next `transpilePackages` instead of forcing app upgrades.
- MiroShark is AGPL-3.0 upstream and is not vendored into this repo. The shared package calls an external/local service boundary.
- Real secrets are not copied. Env examples must be filled manually before live integration checks can succeed.
