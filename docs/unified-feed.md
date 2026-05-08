# Unified Feed Architecture

## Current Feed Landscape

### Existing feeds
- **hypermyths** `/feed`: client-side SSE, `EventSource` to `/api/autonomous/feed`, polls 3s, shows 30 most recent `Job` records (Prisma schema).
- **hypertian** `/feed`: server component initial data, 30s client polling, shows `FeedJobCard[]` from ads/payments/streams.
- **hypertian** `/api/public/feed` and `/api/public/feed/[adId]`: JSON endpoints for feed items.
- **hypermyths** `/job/[jobId]`: server component with `JobPageClient` (978 lines), client-side 3-15s polling, video playback, asset flow, progress bar.

### No feed at all
- **cancerhawk**: no frontend feed or job page.
- **hyperkaon**: scaffold only.
- **polymyths**: scaffold only.

### Job tables (Supabase)
- `video_jobs`, `ad_jobs`, `research_jobs`, `simulation_jobs`, `intelligence_jobs`, `coding_jobs`, `display_jobs` — defined in `0004_jobs.sql`, not consumed by any frontend.

### Shared types gap
- No unified `FeedItem` or `FeedJob` type exists in shared packages.
- Each app defines its own local types.

### Real-time gap
- No Supabase Realtime subscriptions used anywhere.
- Currently: SSE (hypermyths), client polling (both).

## Final Unified Feed Architecture

One ecosystem-wide feed: `HyperMyths Unified Feed`.

Feed items from:
- HyperMyths Terminal (commands, theses, inference, strategy vault)
- HashMyth (video, video_script, display)
- Polymyths (thesis, prediction, market_analysis, RWA, intelligence)
- CancerHawk (research, cancer_research, dataset, contribution)
- HyperKaon (research, physics_research, simulation, benchmark)
- Hypertian (ad, ad_campaign, display, attention_analysis)
- Platform services (payment, paid_api, github_publish, github_pr, model_eval, inference)
- Local services (local_trade_intent, local_execution_intent, strategy_vault, encrypt_seal, ika_policy, qvac_local_reasoning)

## Web Transparency Rules

Web/platform jobs:
- Transparent by default: show product, job type, status, creator (if public), timestamps.
- Platform pay.sh jobs: show receipt ID, amount, currency, payer type, sponsored metadata.
- Ads: mandatory sponsor/payment metadata visibility.
- Model/inference jobs: show route/model where safe.
- Display artifacts: show public URLs.

## Local Privacy Rules

Local jobs appear as privacy-preserving envelopes:
- Encrypted/pseudonymous actor identity.
- Redacted/encrypted content — safe summaries only.
- Commitment hashes for verification without revealing details.
- Local trading jobs: commitment-only by default.
- QVAC jobs: redacted category + status only.
- Never expose: wallet/key material, raw strategy, trade sizes, QVAC transcripts, local payment secrets.

## Encrypted Creator Identity

- Web jobs: normal creator identity per visibility settings.
- Local jobs: pseudonymous ID by default.
- If `FEED_ACTOR_ENCRYPTION_KEY` configured: encrypt actor metadata.
- If unavailable: deterministic local pseudonym + warning.
- Cloud feed stores encrypted actor blob, NOT raw local user identity.

## Feed Content Redaction/Encryption

For every feed event:
1. Classify privacy tier.
2. Classify job type.
3. Classify local vs web source.
4. Redact or encrypt content as needed.
5. Generate safe summary for private jobs.
6. Create cloud-safe feed envelope.

Safe summaries examples:
- "Private market thesis generated locally"
- "Local QVAC reasoning completed"
- "Local execution intent prepared"
- "Private strategy sealed"
- "User-local paid API call completed"

## Supabase Schema Plan

New migration: `0009_unified_feed.sql`

Tables:
- `unified_feed_items` — core feed item storage
- `unified_feed_events` — status change/update events
- `feed_reactions` — user reactions (star, bookmark, etc.)
- `feed_subscriptions` — user filter subscriptions
- `feed_sync_queue` — local-to-cloud sync queue

RLS: public items readable by all, private by owner, encrypted by anyone (decrypt only by owner), service role bypasses.

## API Plan

`/api/feed` — aggregate feed from all products + Supabase
`/api/feed/global` — public ecosystem feed
`/api/feed/product/:id` — product-scoped feed
`/api/feed/user/:id` — user-scoped feed
`/api/feed/commands/:id` — command-linked feed
`/api/feed/theses/:id` — thesis-linked feed
`/api/feed/:id` — single item
`POST /api/feed` — create feed item
`POST /api/feed/events` — create feed event
`POST /api/feed/:id/reactions`
`POST /api/feed/:id/publish`
`POST /api/feed/:id/unpublish`

Hard rule: `/api/feed/:id/decrypt-local` only available through local gateway.

## UI Plan

Terminal `/feed` route shows unified feed with:
- Filter by product, job type, visibility, status
- Global / local tabs
- Local jobs: encrypted actor badge, local-only badge
- Web jobs: transparent metadata
- Realtime updates if Supabase Realtime configured, polling fallback otherwise

Product apps expose their own scoped `/feed` page using shared components:
- `UnifiedFeed`, `FeedItemCard`, `FeedFilters`, `FeedStatusBadge`, `FeedPrivacyBadge`, `FeedProductBadge`, `FeedReceiptBadge`, `EncryptedActorBadge`, `LocalOnlyBadge`, `FeedArtifactLink`, `FeedTimeline`, `FeedContributionBox`

## Implementation Checklist

- [ ] docs/unified-feed.md
- [ ] packages/feed-privacy (actor encryption, content redaction, safe summaries)
- [ ] packages/unified-feed (types, normalization, filter, persistence)
- [ ] packages/feed-events (event envelope, publish, realtime boundary)
- [ ] Supabase migration 0009_unified_feed.sql
- [ ] Feed API endpoints in services/terminal-api
- [ ] Terminal /feed route page
- [ ] Product feed routes for all apps
- [ ] Shared feed UI components in packages/ui or packages/unified-feed
- [ ] integrate with services: command-worker, thesis-engine, intelligence-worker, video-worker, ad-server, research-worker, simulation-worker, inference-router, platform-payments-worker, local-execution-gateway, qvac-gateway, github-worker
- [ ] Feed privacy tests
- [ ] Check scripts
- [ ] Demo update
- [ ] Env examples update
- [ ] README + MIGRATION_STATUS update

## Validation Checklist

- [ ] All 3 new packages compile
- [ ] Migration SQL valid
- [ ] Feed API routes exist
- [ ] Terminal /feed page exists
- [ ] Privacy tests: no wallet/key/strategy leakage
- [ ] Local jobs use encrypted actor
- [ ] Web jobs transparent
- [ ] pnpm install + typecheck + build pass
- [ ] All check scripts pass
