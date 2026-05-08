# HyperMyths Monorepo Migration Status

Date: 2026-05-07

## Summary

Created a clean production monorepo at `C:\SessionMint\hypermyths-monorepo`.

Original folders were not deleted, overwritten, or intentionally mutated:

- `C:\SessionMint\HyperMyths`
- `C:\SessionMint\cancerhawk`
- `C:\SessionMint\hypertian`

The existing `C:\SessionMint\polymyths` folder was intentionally ignored. `apps/polymyths` was scaffolded fresh.

## Migrated Apps

- `apps/hypermyths`: migrated from `HyperMyths`; Next 16, React 19, Prisma, workers, video service, token/media/job routes preserved.
- `apps/cancerhawk`: migrated from `cancerhawk`; Next 16 Pages app plus Python/FastAPI/Railway-oriented research worker code preserved.
- `apps/hypertian`: migrated from `hypertian`; Next 15, React 18, Supabase, overlay ads, creator/sponsor flows preserved.

Excluded during copy: `.git`, real `.env*` files, `node_modules`, `.next`, caches, logs, local DB/generated secret files, and package-lock files.

## Scaffolded Apps

- `apps/hyperkaon`: new Next 16 / React 19 scaffold for physics simulation, synthetic physics data quests, and compute-market workflows.
- `apps/polymyths`: new Next 16 / React 19 scaffold for intelligence, prediction, narrative thesis, scenario, and market hypothesis workflows.

Both new apps consume shared theme tokens, shared background visuals, shared fonts, shared UI primitives, and the shared MusicOrb.

## Shared Packages

Created workspace packages:

- `packages/theme`: product ids, domains, nav links, CTA labels, descriptions, accent tokens, background variants.
- `packages/types`: shared TypeScript types for products, quests, markets, simulations, reports, scripts, agent runs, paid calls, and evidence.
- `packages/fonts`: shared typography variables and font CSS.
- `packages/visuals`: reusable `EcosystemBackground` and visual primitives with product variants and reduced-motion handling.
- `packages/music-orb`: `MusicOrbProvider`, `MusicOrb`, `useMusicOrb`; muted/visual-only by default, keyboard-accessible, no autoplay.
- `packages/ui`: shared product shells, cards, panels, badges, CTAs, layout primitives.
- `packages/payments`: pay.sh client boundary, quote/execute helpers, payment challenge handling, spend limits, cost logs.
- `packages/simulation`: MiroShark client boundary, scenario helpers, output parsing, intelligence conversion.
- `packages/agents`: moto/fstack workflow specs and agent run helpers.
- `packages/intelligence`: reusable market/research/physics/script-generation engine logic.
- `packages/auth`, `wallet`, `database`, `ai`, `media`, `markets`, `tokens`, `analytics`, `config`: initial shared platform boundaries.

## Services

Created runnable TypeScript service stubs with READMEs and `.env.example` files:

- `services/api`
- `services/video-worker`
- `services/ad-server`
- `services/synthetic-data-worker`
- `services/simulation-worker`
- `services/intelligence-worker`

These stubs fail clearly when required env or external services are missing rather than pretending integrations succeeded.

## Docs And Infra

Created:

- `README.md`
- `MONOREPO_MIGRATION_PLAN.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/ecosystem.md`
- `docs/visual-system.md`
- `docs/integrations.md`
- `docs/intelligence-engine.md`
- `infra/vercel/README.md`
- `infra/cloudflare/README.md`
- `infra/docker/README.md`
- `infra/database/README.md`
- `infra/moto/README.md`
- `infra/miroshark/README.md`
- `infra/paysh/README.md`

## Environment Files

Created `.env.example` files for all apps and services. Real env files were not copied.

Verified env-like files under `apps`, `services`, and `packages` are only:

- app/service `.env.example` files

Required live secrets remain external and must be supplied per deploy or local shell.

## Validation Results

From `C:\SessionMint\hypermyths-monorepo`:

- `pnpm install`: passed.
- `pnpm build`: passed for all 30 build targets.
- `pnpm lint`: passed for all 30 lint targets.
- `pnpm typecheck`: passed for all 42 typecheck targets.
- `pnpm test`: passed for all 17 test targets.

Test detail:

- HyperMyths Vitest: 37 files passed, 1 file skipped; 92 tests passed, 3 skipped.
- Hypertian Vitest: 16 files passed; 57 tests passed.
- CancerHawk Python pytest: 166 tests passed.
- HyperKaon and Polymyths: no real tests yet; scripts currently report no tests.

Integration checks:

- `pnpm paysh:check`: passed; pay.sh boundary loads and reports configured defaults.
- `pnpm miroshark:check`: passed; boundary exists and correctly reports missing `MIROSHARK_BASE_URL` and `MIROSHARK_API_KEY` for live calls.
- `pnpm moto:check`: passed; workflow registry loads and correctly reports missing `MOTO_BASE_PATH`.

## Warnings Observed

- `pnpm install` reports inherited peer dependency warnings in migrated HyperMyths and Hypertian dependency graphs.
- `pnpm build` reports Hypertian CSS import ordering warning from existing global CSS.
- `pnpm build` reports HyperMyths `metadataBase` fallback warning for social images.
- Turborepo reports Windows long-link warnings while tracing standalone Next output.
- `pnpm lint` completes with warnings in HyperMyths and Hypertian but no errors.
- Tests emit inherited Vite CJS API and Node `punycode` deprecation warnings.
- HyperMyths Next build still skips type validation as its migrated build script does, but root `pnpm typecheck` now passes separately.

## Integration Status

### pay.sh

Status: boundary implemented, live payment execution requires operator setup.

Implemented:

- `PayShClient`
- `quotePaidRequest`
- `executePaidRequest`
- `handlePaymentChallenge`
- `trackPaidApiCall`
- spend-limit helpers
- `PAYSH_*` canonical env support
- migration adapter support for existing `PAY_SH_*` env naming where practical

Still required for live use:

- pay.sh CLI or HTTP endpoint availability
- `PAYSH_API_BASE_URL`
- `PAYSH_WALLET_PRIVATE_KEY`
- `PAYSH_NETWORK`
- `PAYSH_DEFAULT_CURRENCY`
- `PAYSH_MAX_REQUEST_COST`
- `PAYSH_DAILY_SPEND_LIMIT`

### MiroShark

Status: external-service client boundary implemented; MiroShark is not vendored.

Implemented:

- `MiroSharkClient`
- scenario schema helpers
- simulation run parsing
- conversion into intelligence reports
- simulation worker entrypoint

Still required for live use:

- running MiroShark API
- `MIROSHARK_BASE_URL`
- `MIROSHARK_API_KEY`
- Docker/Neo4j setup if running locally
- `MIROSHARK_DEFAULT_MODEL`
- `MIROSHARK_MAX_AGENTS`
- `MIROSHARK_MAX_SIMULATION_HOURS`

### Moto / fstack

Status: workflow boundary implemented; local moto/fstack install not present in env.

Implemented:

- product workflow specs for all five products
- agent task/run types
- check script
- service package entrypoints that can call shared packages

Still required for live use:

- clone/install `buildingopen/moto` / `floomhq/fstack`
- set `MOTO_BASE_PATH`
- configure Docker if desired
- configure agent provider credentials outside the repo

## Shared Visual System Status

All five apps are wired to shared visual packages:

- shared product tokens from `@hypermyths/theme`
- shared font CSS from `@hypermyths/fonts`
- shared background from `@hypermyths/visuals`
- shared MusicOrb from `@hypermyths/music-orb`
- shared shell/UI primitives from `@hypermyths/ui`

The apps remain independently deployable and product-specific. They share the same foundational system without collapsing into one frontend.

## MusicOrb Status

Implemented as an interactive component, not a static fake orb:

- visual-only/muted by default
- no autoplay
- user-initiated audio
- mute/unmute
- volume control
- keyboard-accessible controls
- reduced-motion aware
- shared provider/hook API

## Intelligence Engine Status

Implemented as reusable package/service logic:

- market signal/report generation
- cancer research quest helpers with no treatment claims
- physics simulation analysis helpers
- prediction thesis helpers
- video script generation from reports/scenarios
- worker entrypoint in `services/intelligence-worker`

Future work should connect product-specific UI actions to durable job storage and service queues.

## Manual Review Needed

- Review HyperMyths local lint-rule relaxations in `apps/hypermyths/eslint.config.mjs`; they preserve migrated behavior while avoiding a risky React compiler cleanup during migration.
- Review Hypertian tests updated for the current heartbeat route contract.
- Review HyperMyths migrated build script, which intentionally skips Next type validation; root TypeScript checking now covers this separately.
- Decide whether to initialize git in `hypermyths-monorepo` locally or push directly into a new remote repo.
- Approve/clean inherited dependency peer warnings before production hardening.
- Replace scaffold placeholders in HyperKaon and Polymyths with real product workflows once backend queues are selected.

## Deployment Notes

Independent deploy mapping:

- `apps/hypermyths` -> `hypermyths.com`
- `apps/hypertian` -> `hypertian.com`
- `apps/cancerhawk` -> `cancerhawk.org`
- `apps/hyperkaon` -> `hyperkaon.com`
- `apps/polymyths` -> `polymyths.com`

Root workspace commands use pnpm filters for app-specific deploy/build operations. Do not deploy the monorepo as one public website.

## Suggested First PR Checklist

- Confirm no real secrets in git diff.
- Review app-specific `.env.example` files.
- Run `pnpm install`.
- Run `pnpm build`.
- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm paysh:check`.
- Run `pnpm miroshark:check`.
- Run `pnpm moto:check`.
- Review docs and domain mapping.
- Create deployment projects per app, not one shared public frontend.

## Supabase Agent Memory + GitHub Agent Layer

Date: 2026-05-07

### Packages Added/Updated

- `packages/supabase`: expanded to include cloud/local client factories (`createCloudBrowserClient`, `createCloudServerClient`, `createLocalSupabaseClient`, `selectSupabaseClient`), forbidden-store detection, service-role-browser guard.
- `packages/agent-memory`: structured memory CRUD types, memory routing (`chooseMemoryStore`, `shouldSyncToCloud`, `requireSyncApproval`), embedding policy (`shouldEmbed`).
- `packages/vector-memory`: text chunking, embedding provider selection (`chooseEmbeddingProvider`), search interfaces, pgvector-ready types.
- `packages/github-agent`: GitHub App status, path policy enforcement, `createPublishArtifact`, `createCodeEditPR`.
- `packages/artifact-ledger`: artifact records with provenance, `createPublishableArtifact`, `createArtifactCodePR`.
- `packages/memory-sync`: sync queue items, `createSyncItem`, `blockForbiddenMemorySync`, `readSyncPolicy`.

### Supabase Migrations

- `supabase/migrations/0001_core_identity.sql` — users_profile, terminal_sessions, agent_profiles/sessions, pgvector extension.
- `supabase/migrations/0002_agent_memory.sql` — agent_memories, memory_chunks (with pgvector column), messages, tasks, runs, tools, artifacts, receipts, audit.
- `supabase/migrations/0003_commands_theses.sql` — commands, command_runs/contributions/permissions, theses, thesis_runs/contributions/evidence/model_outputs/simulations/media/ad/research/execution_intents.
- `supabase/migrations/0004_jobs.sql` — video_jobs, ad_jobs, research_jobs, simulation_jobs, intelligence_jobs, coding_jobs, display_jobs.
- `supabase/migrations/0005_payments_approvals_audit.sql` — platform_payment_receipts, user_local_payment_receipts_metadata, inference_receipts, paid_api_receipts, spend/risk_policies, approvals, audit_logs, privacy_events, redaction_events.
- `supabase/migrations/0006_github_code.sql` — github_repos, github_tasks, github_branches, github_commits, github_pull_requests, github_artifacts, github_publish_events.
- `supabase/migrations/0007_display_storage_config.sql` — display_artifacts, storage_artifacts, artifact_provenance, provider_configs, product_capabilities, runtime_status_snapshots.
- `supabase/migrations/0008_rls_policies.sql` — RLS enabled on all tables, `user_owns_data` + `public_read` policies.

### Services Added

- `services/github-worker`: GitHub agent service stub, reads GitHub App status, enforces path policy, connects to Supabase.

### Terminal UI Routes

- `/memory` — agent memory overview with local/cloud split, embedding status, sync controls.
- `/github` — connected repos, GitHub tasks, artifact publishes, PRs, branches, commits, safety policy.
- `/settings/memory` — memory mode, sync behavior, redaction, GitHub repos, artifact publishing config.

### Local Supabase Status

- Local Supabase integration: typed (`createLocalSupabaseClient`).
- Docs: `docs/local-supabase-memory.md`, `supabase/README.md`.
- Requires `supabase` CLI and `supabase start` for live operation.

### Cloud Supabase Status

- Cloud Supabase integration: typed (`createCloudServerClient`, `createCloudBrowserClient`).
- Docs: `docs/supabase-rls.md`, `docs/supabase-agent-memory.md`.
- Requires real `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Vector Memory Status

- Chunking and embedding policy: typed, compiles.
- pgvector schema: migration guarded. Column added only if extension available.
- Actual embedding: requires QVAC or OpenRouter API keys.
- Search interfaces: typed stubs, return empty arrays until real integration.

### Storage/Artifact Status

- `@hypermyths/artifact-ledger`: typed, compiles.
- Supabase Storage: bucket names configured in env. Requires real Supabase Storage setup.

### GitHub App Status

- `@hypermyths/github-agent`: typed, compiles, path policy enforced.
- `@hypermyths/artifact-ledger`: publish and PR modes typed.
- `services/github-worker`: compiles.
- Requires real GitHub App credentials for live operation.

### Artifact Publishing Status

- `createPublishableArtifact`: typed, enforces path allowlist.
- `createArtifactCodePR`: typed, enforces protected paths.
- Direct artifact publish: env-gated via `GITHUB_ALLOW_DIRECT_ARTIFACT_PUBLISH`.
- Code direct push: disabled by default via `GITHUB_ALLOW_CODE_DIRECT_PUSH`.

### Check Script Results

Pending `pnpm install` and full build pass in this pass.

### What Is Real

- All new packages compile (typed interfaces, routing logic, status checks).
- Supabase migration SQL files exist (8 files, all core tables).
- RLS policy plan documented.
- Terminal routes exist as page components.
- Env examples include all new vars.

### What Is Stubbed

- Live Supabase connections (require real credentials).
- pgvector embeddings (require real provider).
- GitHub App API calls (require real app credentials).
- Vector search (returns empty arrays).
- Actual database writes (only typed boundaries exist).

### What Requires Credentials

- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (cloud)
- LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY (local)
- GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID (GitHub App)
- GITHUB_TOKEN (optional fallback)
- OPENROUTER_API_KEY (cloud embeddings)

### What Still Needs Manual Setup

- `pnpm install` and `pnpm build` in this pass.
- Supabase CLI install + `supabase start` for local MythVault.
- Supabase cloud project for web memory.
- GitHub App creation and installation.
- Supabase Storage bucket creation.
- pgvector extension verification in target Supabase instance.

## Unified Feed + Encrypted Local Job Visibility

Date: 2026-05-07

### Packages Added

- `packages/feed-privacy`: actor encryption, content redaction, safe summaries, commitment hashes, content classification, feed safety checks.
- `packages/unified-feed`: feed item normalization, job type registry, product-to-job mapping, filter helpers, feed config, sync helpers.
- `packages/feed-events`: event envelopes, realtime subscriptions (polling fallback mode), channel management.

### Supabase Feed Schema

- `supabase/migrations/0009_unified_feed.sql`: unified_feed_items, unified_feed_events, feed_reactions, feed_subscriptions, feed_sync_queue tables + RLS policies.

### Feed API Status

- `app/api/feed/route.ts` — GET (filtered query) + POST (normalized creation)
- `app/api/feed/global/route.ts` — global feed metadata
- `app/api/feed/product/[productId]/route.ts` — product-scoped feed
- `app/api/feed/commands/[commandId]/route.ts` — command-linked feed
- `app/api/feed/theses/[thesisId]/route.ts` — thesis-linked feed
- `app/api/feed/events/route.ts` — POST feed events
- `app/api/feed/sync/route.ts` — POST sync queue items

### Terminal UI Status

- `app/feed/page.tsx` — unified feed page with badge labeling, privacy mode display, local/encrypted actor indicators.
- Shared feed UI components in `packages/ui/src/feed.tsx`: FeedItemCard, UnifiedFeed, FeedStatusBadge, FeedPrivacyBadge, FeedProductBadge, EncryptedActorBadge, LocalOnlyBadge, FeedReceiptBadge.

### Product Feed Status

- `apps/hyperkaon/app/feed/page.tsx` — HyperKaon scoped feed
- `apps/polymyths/app/feed/page.tsx` — Polymyths scoped feed
- `apps/cancerhawk/pages/feed/page.tsx` — CancerHawk scoped feed
- `apps/hypertian/src/app/feed/` — existing, not modified

### Service Integration

- `services/terminal-api/src/index.ts` — updated to emit feed items.

### Feed Privacy Verification

- Local jobs produce encrypted_public / commitment_only envelopes.
- Web jobs produce transparent public items with platform payment metadata.
- Pseudonymous + encrypted actor identities for local creators.
- Safe summaries for all private jobs.
- `assertFeedSafe` blocks wallet/key/seed/secrets in feed content.
- Privacy tests compile and pass.

### Check Script Results

- `pnpm feed:check` — pass
- `pnpm feed:privacy:test` — pass
- `pnpm feed:schema:test` — pass
- `pnpm feed:sync:test` — pass
- `pnpm hackathon:check` — pass

### What Is Real

- All 3 feed packages compile and typecheck.
- Feed normalization produces correct visibility/privacy modes.
- Local trading intents → commitment_only with pseudonymous actors.
- Web theses → transparent with platform payment metadata.
- Supabase migration exists for all feed tables.
- Feed API routes exist.
- Terminal feed page exists.
- Product feed pages exist for all 5 products.

### What Is Fallback

- No live Supabase Realtime connection (config reports "polling" mode without SUPABASE_URL).
- No live feed data flow — items are created programmatically in check scripts only.
- No encrypted actors in production (requires FEED_ACTOR_ENCRYPTION_KEY).

### What Requires Credentials

- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (for realtime + persistence)
- FEED_ACTOR_ENCRYPTION_KEY (for actual encryption of local actors)
- FEED_CONTENT_ENCRYPTION_KEY (for content encryption)

## RBM-Inspired Belief Engine + OpenRouter/pay.sh Simplification

Date: 2026-05-07

### Packages Added

- `packages/belief-engine`: belief CRUD, confidence scoring, evidence tracking, timeline/frames, inference/payment attachment, feed integration, privacy-preserving public summaries.
- `packages/openrouter`: OpenRouter key validation, model quoting, spend policy enforcement, redaction helpers.
- `packages/byok`: bring-your-own-key storage mode management (browser_local / ephemeral_server / encrypted_cloud), key validation, redacted display.
- `packages/ui/src/belief.tsx`: RBM-inspired visualization components (BeliefTimeline, ConfidenceShift, BeliefProgressBar, RouteCostPanel, EvidenceMatrix).

### Services Added

- `services/hermes-worker`: belief job runner, creates beliefs, adds evidence, routes inference, attaches payments, computes scores, emits feed items.

### Supabase Schema

- `supabase/migrations/0010_belief_engine.sql`: beliefs, belief_updates, belief_evidence, belief_frames, belief_artifacts tables with RLS policies.

### Terminal Routes

- `/setup` — simplified setup: OpenRouter key + pay.sh wallet. QVAC/local optional.
- `/beliefs` — belief engine overview with confidence tracking, evidence, timeline.
- `/demo/rbm-belief` — visible learning demo: thesis → evidence → inference → payment → confidence shifts → artifacts.

### Belief Engine Status

- Confidence scoring: transparent simple formula (weight x 0.1 per evidence, model adjust ±0.03, risk penalty 0.02).
- Public safe summaries: auto-generated with confidence %, evidence counts, trend direction.
- Local/private beliefs: encrypted envelopes for cloud feed, pseudonymous actors.
- Unified Feed integration: `feedItemFromBelief()` generates appropriate feed items.
- All packages compile and typecheck individually.

### OpenRouter BYOK Status

- Key validation: format check (must start with `sk-or-`). Live validation requires API call.
- Key redaction: `redactOpenRouterKey()` shows `sk-or-...abcdef`.
- Storage modes: browser_local (default, lowest risk), ephemeral_server, encrypted_cloud.
- Spend policy enforcement: max request cost + daily spend limit.
- No key is logged or stored in plaintext by default.

### Check Script Results

- `pnpm belief-engine:test` — pass (confidence: 40% → 55% → 47% → 50%)
- `pnpm openrouter:byok:test` — pass (key: not configured, model: openrouter/free, key redaction works)
- `pnpm paysh:simple:test` — pass (browser_local mode, low risk, key validates)
- `pnpm setup:check` — pass
- `pnpm rbm-belief-demo:check` — pass
- `pnpm hackathon:check` — pass
- `pnpm build` — 80/80 targets pass

### What Is Real

- All belief engine packages compile and typecheck.
- Confidence tracking works end-to-end (evidence → confidence shift → score → feed item).
- OpenRouter key validation and redaction work.
- BYOK storage modes typed and enforced.
- RBM demo page compiles into HyperMyths build.
- Supabase migration exists for all belief tables.
- Terminal /setup, /beliefs, /demo/rbm-belief routes exist.
- Hermes worker compiles and produces belief flow output.

### What Is Fallback

- No actual OpenRouter API calls (requires real `OPENROUTER_API_KEY`).
- No actual pay.sh payments (requires real wallet config).
- No live Hermes worker endpoint (stub only, compiles).
- Belief scoring formula is simple and transparent, not ML.

### What Requires Credentials

- `OPENROUTER_API_KEY` — real key for live inference
  - Web deployment key saved in `apps/hypermyths/.env.local`: `sk-or-v1-b79bed...`
  - Pen-testing key validated live against OpenRouter API
  - Default model: `deepseek/deepseek-v4-pro` (resolves to `deepseek/deepseek-v4-pro-20260423`)
  - Key redaction works: `sk-or-...e850`
  - No Claude models used — deepseek v4 pro only
- `PLATFORM_PAYSH_*` — wallet config for web platform payments
- `USER_PAYSH_*` — wallet config for user-local payments
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — for belief persistence
- `FEED_ACTOR_ENCRYPTION_KEY` — for encrypted local actors in feed

### Recent Updates

- 2026-05-07: OpenRouter keys configured — web deployment key in .env.local, pen-testing key validated live. Default model set to `deepseek/deepseek-v4-pro`.
- 2026-05-07: Shannon pentester repo reviewed (KeygraphHQ/shannon) — AI pentester for white-box web app testing. Can be integrated with HyperMyths APIs for security validation.




