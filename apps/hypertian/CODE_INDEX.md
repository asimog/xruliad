# CODE_INDEX

The product surface is now four primary public routes — Streamer, Directory, Feed, Music — plus
a footer-linked Feedback form and an `ADMIN_PASSWORD`-gated `/admin`. Privy is optional; nothing requires sign-in. The
overlay route fires the heartbeats; the directory shows streams whose heartbeat landed in
the last minute, with a small grace window. Commission is wired through but disabled (`COMMISSION_ENABLED = false`).
Pump stream payments are pinned to the Pump deployer wallet; X stream payments use the
wallet submitted in the streamer form.

The earlier surface (X Ads, Pump, sponsor/streamer dashboards, marketplace, etc.) is
quarantined under [src/_legacy_app/](src/_legacy_app/) and gitignored — kept locally for
reference but never routed.

## App Routes

| File | Purpose |
| --- | --- |
| [src/app/page.tsx](src/app/page.tsx) | Redirects `/` to `/directory`. |
| [src/app/streamer/page.tsx](src/app/streamer/page.tsx) | Anonymous streamer profile + overlay heartbeat verification + banner approvals. |
| [src/app/directory/page.tsx](src/app/directory/page.tsx) | Live streams (heartbeat fresh ≤60s) with chart/media request actions. |
| [src/app/feed/page.tsx](src/app/feed/page.tsx) | Public job cards: every ad + payment in the system. |
| [src/app/music/page.tsx](src/app/music/page.tsx) | Persistent music route with MP3 playlist/upload, YouTube playback, and reactive Earth visualizer. |
| [src/app/feedback/page.tsx](src/app/feedback/page.tsx) | Footer-linked bug / ad-issue / feature submission form. |
| [src/app/admin/page.tsx](src/app/admin/page.tsx) | Password-gated moderation dashboard. |
| [src/app/overlay/[streamId]/page.tsx](src/app/overlay/[streamId]/page.tsx) | OBS browser-source overlay; pings `/api/streams/heartbeat` every minute. |

## UI Shell And Views

| File | Purpose |
| --- | --- |
| [src/components/app-shell.tsx](src/components/app-shell.tsx) | 4-tab nav, optional Privy sign-in chip, footer feedback/admin links, mini music transport; suppressed on `/overlay`. |
| [src/components/music-provider.tsx](src/components/music-provider.tsx) | Persistent Web Audio/YouTube music engine shared across routes. |
| [src/components/music-experience.tsx](src/components/music-experience.tsx) | `/music` client UI: transport, playlist, upload, YouTube input, Earth-like audio particle canvas. |
| [src/components/streamer-workspace.tsx](src/components/streamer-workspace.tsx) | Streamer page client: profile form, Pump deployer wallet capture, heartbeat poller, banner upload/save, ad approvals. |
| [src/components/directory-view.tsx](src/components/directory-view.tsx) | Directory client: 60s refresh + chart/media request triggers. |
| [src/components/request-ad-dialog.tsx](src/components/request-ad-dialog.tsx) | Modal that creates a chart/banner ad job card and shows the deposit address. |
| [src/components/feed-view.tsx](src/components/feed-view.tsx) | Feed client: 30s refresh, status-coded job cards with payment lines. |
| [src/components/feedback-form.tsx](src/components/feedback-form.tsx) | Feedback client form (POST `/api/public/feedback`). |
| [src/components/admin-login.tsx](src/components/admin-login.tsx) | Admin password entry. |
| [src/components/admin-dashboard.tsx](src/components/admin-dashboard.tsx) | Admin tabs (feedback / jobs / streams) with hide / heartbeat / resolve actions. |
| [src/components/copy-button.tsx](src/components/copy-button.tsx) | Reusable copy-to-clipboard button. |
| [src/components/providers.tsx](src/components/providers.tsx) | Privy + Supabase provider composition (Privy fully optional). |

## Overlay System

| File | Purpose |
| --- | --- |
| [src/components/OverlaySurface.tsx](src/components/OverlaySurface.tsx) | Shared overlay runtime: chart, media, disclosure, heartbeat. |
| [src/components/DexChart.tsx](src/components/DexChart.tsx) | Lightweight Charts wrapper. |
| [src/components/MediaBanner.tsx](src/components/MediaBanner.tsx) | Image/gif/video creative renderer. |
| [src/components/OverlayDisclosure.tsx](src/components/OverlayDisclosure.tsx) | Sponsorship footer. |
| [src/hooks/useDexScreener.ts](src/hooks/useDexScreener.ts) | DexScreener client hook. |
| [src/lib/overlay.ts](src/lib/overlay.ts) | Query-param parsing for overlay configs. |

## Public API (anonymous)

| File | Purpose |
| --- | --- |
| [src/app/api/public/streams/route.ts](src/app/api/public/streams/route.ts) | GET = list streams owned by this browser session; POST = create anonymous profile + return overlay URL. |
| [src/app/api/public/streams/heartbeat-status/route.ts](src/app/api/public/streams/heartbeat-status/route.ts) | Lightweight per-stream heartbeat freshness probe (used by streamer page poller). |
| [src/app/api/public/streams/banner/route.ts](src/app/api/public/streams/banner/route.ts) | Owner-session-gated default banner update. |
| [src/app/api/public/ads/review/route.ts](src/app/api/public/ads/review/route.ts) | Owner-session-gated banner approve/reject. |
| [src/app/api/public/directory/route.ts](src/app/api/public/directory/route.ts) | Live streams list (heartbeat ≤60s). |
| [src/app/api/public/feed/route.ts](src/app/api/public/feed/route.ts) | Public job-card feed (ads + payments). |
| [src/app/api/public/feedback/route.ts](src/app/api/public/feedback/route.ts) | Submit feedback. |

## Admin API (`ADMIN_PASSWORD`-gated)

| File | Purpose |
| --- | --- |
| [src/app/api/admin/login/route.ts](src/app/api/admin/login/route.ts) | Verify password, set signed admin cookie. |
| [src/app/api/admin/logout/route.ts](src/app/api/admin/logout/route.ts) | Clear admin cookie. |
| [src/app/api/admin/data/route.ts](src/app/api/admin/data/route.ts) | All streams + ads + feedback for the dashboard. |
| [src/app/api/admin/actions/route.ts](src/app/api/admin/actions/route.ts) | Hide ad / hide stream / force heartbeat / resolve feedback. |

## Existing API (still in use)

| File | Purpose |
| --- | --- |
| [src/app/api/ads/route.ts](src/app/api/ads/route.ts) | Anonymous-friendly ad creation; reused by directory `RequestAdDialog`. |
| [src/app/api/streams/heartbeat/route.ts](src/app/api/streams/heartbeat/route.ts) | Overlay heartbeat receiver (HMAC-keyed). |
| [src/app/api/streams/route.ts](src/app/api/streams/route.ts) | Privy-authenticated stream creation (kept for legacy callers). |
| [src/app/api/payments/verify/route.ts](src/app/api/payments/verify/route.ts) | Verify Solana deposits and activate ads. |
| [src/app/api/cron/payments/route.ts](src/app/api/cron/payments/route.ts) | Background payment-verification cron. |
| [src/app/api/dex/search/route.ts](src/app/api/dex/search/route.ts), [src/app/api/dex/pair/route.ts](src/app/api/dex/pair/route.ts) | DexScreener proxies. |
| [src/app/api/filebase/upload-url/route.ts](src/app/api/filebase/upload-url/route.ts) | Presigned S3 upload URLs. |
| Other `api/*` routes | Legacy intent / scheduler / live-index / overlay-verify endpoints retained for compatibility. |

## Auth, Sessions, And Infrastructure

| File | Purpose |
| --- | --- |
| [src/lib/owner-session.ts](src/lib/owner-session.ts) | Server-issued anonymous owner cookie that binds streams to a browser. |
| [src/lib/admin-session.ts](src/lib/admin-session.ts) | `ADMIN_PASSWORD` check + signed admin cookie. |
| [src/lib/overlay-auth.ts](src/lib/overlay-auth.ts) | HMAC heartbeat key generator/validator. |
| [src/lib/env.ts](src/lib/env.ts) | Env parsing + feature toggles (Privy, Supabase, Filebase). |
| [src/lib/constants.ts](src/lib/constants.ts) | Platform constants; `COMMISSION_ENABLED = false` keeps fees code-resident but charges 0. |
| [src/lib/types.ts](src/lib/types.ts) | Shared domain types (now includes `owner_session`, `is_hidden`). |
| [src/lib/platform.ts](src/lib/platform.ts) | URL/platform validators + heartbeat freshness helper. |
| [src/lib/payment-routing.ts](src/lib/payment-routing.ts) | Escrow vs direct payout routing; honors `PUMPFUN_COMMISSION_BPS` (currently 0). |
| [src/lib/solana.ts](src/lib/solana.ts) | Deposit-address generation, payment verification, escrow sweep. |
| [src/lib/dexscreener.ts](src/lib/dexscreener.ts) | DexScreener fetchers + synthetic candle helpers. |
| [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) | Service-role Supabase client. |
| [src/lib/supabase/queries.ts](src/lib/supabase/queries.ts) | Authenticated streamer/sponsor queries (legacy paths). |
| [src/lib/supabase/anon-queries.ts](src/lib/supabase/anon-queries.ts) | Anonymous + admin queries (directory, feed, feedback, banner approvals, moderation). |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts), [src/lib/supabase/browser.ts](src/lib/supabase/browser.ts), [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Browser + SSR Supabase clients. |

## Database

| File | Purpose |
| --- | --- |
| [supabase/migrations/001_initial.sql](supabase/migrations/001_initial.sql) | Initial schema. |
| [supabase/migrations/002_payment_deposits.sql](supabase/migrations/002_payment_deposits.sql) | Deposit-address columns. |
| [supabase/migrations/003_ad_ownership.sql](supabase/migrations/003_ad_ownership.sql) | Ad ownership/sponsor columns. |
| [supabase/migrations/004_open_livestream_ads.sql](supabase/migrations/004_open_livestream_ads.sql) | Stream profile + ad-type extensions. |
| [supabase/migrations/005_payment_routing_commissions.sql](supabase/migrations/005_payment_routing_commissions.sql) | Escrow + commission columns. |
| [supabase/migrations/006_anon_streams_and_feedback.sql](supabase/migrations/006_anon_streams_and_feedback.sql) | Anonymous owner sessions, hide flags, feedback inbox. |

## Tests

| File | Purpose |
| --- | --- |
| [tests/dexscreener.test.ts](tests/dexscreener.test.ts) | Synthetic OHLC generation. |
| [tests/overlay.test.ts](tests/overlay.test.ts) | Overlay query parsing. |

## Reference Docs

| File | Purpose |
| --- | --- |
| [README.md](README.md) | Setup, architecture, runtime documentation. |
| [docs/MIGRATION_NOTES.md](docs/MIGRATION_NOTES.md) | Migration status + repo direction notes. |
