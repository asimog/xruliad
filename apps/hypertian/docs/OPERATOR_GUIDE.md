# Hypertian Operator Guide

## Purpose

This guide is for the person running the deployment, owning secrets, and handling production checks.

It focuses on:

- what to provision
- where each credential comes from
- what is optional versus actually required
- how to verify the app is healthy after deployment

## Current Product Reality

As of April 26, 2026, the current codebase behaves like this:

- active creator/sponsor routes exist for `X Ads` and `PumpAds`
- stream and sponsor dashboards depend on Privy-backed auth
- payment verification depends on Solana RPC access and Supabase writes
- overlay liveness now depends on signed per-stream heartbeat keys
- escrow-style deposit secrets are encrypted at rest
- verified escrow balances are swept automatically by the backend
- banner ads currently rely on an HTTPS banner URL plus streamer review
- DexScreener client data now uses polling instead of the older websocket path
- Earth renderer uses memory-optimized packed lookup buffers (~33% reduction in per-pixel state)

This matters because some older docs and comments still describe broader or earlier behavior.

## Accounts You Need

- Supabase project
- Privy app
- Helius account
- Vercel project or another Next.js hosting target
- optional Filebase account if you want presigned upload support
- a dedicated Solana treasury wallet for platform fees

## Secret Inventory

### Required for a real deployment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA=
HELIUS_RPC_URL=
```

### Recommended

```bash
PRIVY_VERIFICATION_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
OVERLAY_SIGNING_SECRET=
ESCROW_ENCRYPTION_SECRET=
```

### Optional

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=
FILEBASE_ACCESS_KEY_ID=
FILEBASE_SECRET_ACCESS_KEY=
FILEBASE_BUCKET=
NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Where To Get The Keys

### Supabase

Get these from the Supabase project dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- optional legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Path:

- Project dashboard
- Settings
- API or API Keys

Notes:

- Prefer the newer publishable key for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- This repo still explicitly expects `SUPABASE_SERVICE_ROLE_KEY`, so use the legacy `service_role` key value
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser

Official doc:

- https://supabase.com/docs/guides/api/api-keys

### Privy

Get these from the Privy Dashboard:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

Path:

- Configuration
- App settings
- Basics

Recommended extra:

- `PRIVY_VERIFICATION_KEY`

Why it matters:

- the code verifies access tokens in `src/lib/privy.ts`
- if `PRIVY_VERIFICATION_KEY` is set, verification can avoid the slower fallback path
- if it is missing, the code falls back to `PRIVY_APP_SECRET`

Official docs:

- https://docs.privy.io/api-reference/introduction
- https://docs.privy.io/guide/server/authorization/verification
- https://docs.privy.io/recipes/dashboard/optimizing

### Helius

Get `HELIUS_RPC_URL` from the Helius dashboard after creating an RPC endpoint.

Path:

- Helius dashboard
- Endpoints
- Create or select endpoint
- Copy the RPC URL

Why it matters:

- server-side payment verification uses `HELIUS_RPC_URL` first
- if omitted, the code falls back to `NEXT_PUBLIC_SOLANA_RPC_URL`
- if that is also omitted, it falls back to Solana public mainnet RPC

Official doc:

- https://www.helius.dev/docs/rpc/overview/

### Platform Treasury Wallet

`NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA` is not issued by a vendor.

You create or designate this wallet yourself. It should be the public Solana address that receives platform fees for Pump ads.

Recommended practice:

- use a dedicated treasury wallet, not a personal hot wallet
- keep custody of the private key outside the app env
- if possible, use a hardware-wallet-backed treasury or an operational multisig

### Cron Secret

`CRON_SECRET` is self-generated.

Example:

```bash
openssl rand -hex 32
```

Use it as the Bearer token for:

- `GET /api/cron/payments`

### Overlay Signing Secret

`OVERLAY_SIGNING_SECRET` is self-generated.

It signs the per-stream heartbeat key embedded in overlay URLs.

Recommended:

- set a dedicated random secret instead of relying on the fallback to `SUPABASE_SERVICE_ROLE_KEY`
- rotate it deliberately, knowing that previously issued overlay URLs will stop heartbeating until refreshed

Example:

```bash
openssl rand -hex 32
```

### Escrow Encryption Secret

`ESCROW_ENCRYPTION_SECRET` is self-generated.

It encrypts escrow deposit secrets before they are stored. The code can still read older plaintext rows for backward compatibility, but production should use a dedicated encryption secret.

Example:

```bash
openssl rand -hex 32
```

### DexScreener

The current client hook uses periodic REST polling.

Operator guidance:

- there is no DexScreener websocket env to configure in the current runtime
- do not block deployment on a websocket setup that the app no longer uses

## One-Time Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Provision Supabase schema

Apply all migrations in order:

```text
001_initial.sql
002_payment_deposits.sql
003_ad_ownership.sql
004_open_livestream_ads.sql
005_payment_routing_commissions.sql
```

Files live in [supabase/migrations](/mnt/d/mythOS/CAMIKEY/supabase/migrations).

### 3. Configure deployment env

Set env vars in your host, for example Vercel project settings.

### 4. Optional Filebase setup

Only do this if you want Filebase-backed upload URLs:

- create a Filebase bucket
- create S3-compatible credentials
- set `FILEBASE_ACCESS_KEY_ID`
- set `FILEBASE_SECRET_ACCESS_KEY`
- set `FILEBASE_BUCKET`
- optionally set `NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL`

Important:

- the current primary banner flow works with direct HTTPS banner URLs

## Pre-Deploy Verification

Run:

```bash
npm run pipeline
npm run build
```

`npm run pipeline` covers linting, typechecking, and tests.

## Memory & Performance

The Earth background renderer (used on most pages) has been optimized to reduce memory usage without affecting visual quality:

- **Texture lookup buffers**: texU/texV/lambert values are now packed into a single interleaved `Uint8Array` (4 bytes per pixel) instead of three separate arrays (6 bytes per pixel). This reduces per-pixel state by ~33% and improves cache locality.
- **Shared texture cache**: The generated earth texture is cached at the module level and shared across all renderer instances, avoiding redundant generation.
- **Zero-fill optimization**: Out-of-disk pixels have their alpha pre-zeroed during setup, avoiding per-frame writes.

These changes reduce resident GPU/CPU memory pressure while maintaining identical visual output and animation quality. The background music-reactive particle system and bloom effects are unchanged.

## Deployment Checklist

- all required env vars are present
- Supabase migrations are applied
- Privy app domain/origin settings match your deployment URL
- `HELIUS_RPC_URL` resolves from the deployment environment
- `NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA` is the intended treasury address
- `CRON_SECRET` is set if cron reconciliation is enabled
- `OVERLAY_SIGNING_SECRET` is set explicitly
- `ESCROW_ENCRYPTION_SECRET` is set explicitly

## Smoke Test Checklist

After deployment:

1. Load `/` and confirm the homepage renders.
2. Load `/streams` and confirm stream inventory can be fetched.
3. Authenticate through Privy and confirm `/dashboard/streamer` loads.
4. Create a test stream and confirm it appears in the dashboard.
5. Open the returned overlay URL and confirm heartbeats succeed.
6. Create a test ad through `/dashboard/sponsor`.
7. Verify the app returns a deposit address or direct payment target, depending on ad type.
8. Submit a small test payment and run payment verification with a known signature.
9. If the payment used escrow, confirm the sweep transaction hash is returned.
10. For banner ads, confirm streamer approval via `/api/ads/review`.

## Operational Runbook

### User sync

Route:

- `POST /api/auth/sync`

What to watch:

- Privy must be configured
- the user must exist in Supabase after sync

### Stream creation

Route:

- `POST /api/streams`

What to watch:

- requires a synced Privy user
- validates URLs and payout wallet
- for Pump streams, may verify creator wallet against the mint
- returns a signed overlay URL that should be treated as the live overlay entrypoint

### Overlay heartbeat

Route:

- `POST /api/streams/heartbeat`

What to watch:

- the overlay must send the correct signed key for the target stream
- the route updates liveness, but no longer acts as an unauthenticated verification toggle

### Ad creation

Route:

- `POST /api/ads`

What to watch:

- chart ads require a DexScreener pair lookup to succeed
- banner ads require an HTTPS banner URL
- returns payment routing details and deposit address
- if the caller is authenticated, the ad is attributed to the sponsor account for dashboard history

### Payment verification

Route:

- `POST /api/payments/verify`

What to watch:

- requires `txSignature`
- validates recipient and amount against Solana chain data
- returns a minimal public payment status payload, not raw admin records
- for escrow payments, attempts an automatic sweep after verification and returns the sweep transaction hash when successful

### Cron reconciliation

Route:

- `GET /api/cron/payments`

Header:

```text
Authorization: Bearer <CRON_SECRET>
```

Use this when:

- you want server-side reconciliation of pending payments
- you do not want to rely only on client-driven verification polling

Scheduler:

- Supabase `pg_cron` job `poll-pending-payments` calls this route every 5 minutes
- The bearer token is stored in the Supabase cron job definition, not in the repo

## Troubleshooting

### Stream dashboard says the user must be synced

Likely cause:

- the user authenticated with Privy but `POST /api/auth/sync` did not run or failed

### Privy routes fail with incomplete environment variables

Likely cause:

- missing `NEXT_PUBLIC_PRIVY_APP_ID`
- missing `PRIVY_APP_SECRET`
- or missing `PRIVY_VERIFICATION_KEY` with no usable fallback

### Payment verification is slow or flaky

Likely cause:

- missing or poor-quality RPC endpoint

Fix:

- set `HELIUS_RPC_URL`

### Pump ad creation throws about `NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA`

Likely cause:

- Pump commission routing needs the platform treasury wallet

Fix:

- set `NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA` to your treasury public address

### Banner upload endpoints fail

Expected today:

- the media job upload/review endpoints are intentionally disabled

Use instead:

- direct HTTPS banner URLs
- optional Filebase upload-url helper if you are handling uploads externally

## Source References Inside The Repo

- [src/lib/env.ts](/mnt/d/mythOS/CAMIKEY/src/lib/env.ts)
- [src/lib/privy.ts](/mnt/d/mythOS/CAMIKEY/src/lib/privy.ts)
- [src/lib/payment-routing.ts](/mnt/d/mythOS/CAMIKEY/src/lib/payment-routing.ts)
- [src/lib/payments.ts](/mnt/d/mythOS/CAMIKEY/src/lib/payments.ts)
- [src/hooks/useDexScreener.ts](/mnt/d/mythOS/CAMIKEY/src/hooks/useDexScreener.ts)
- [src/app/api/cron/payments/route.ts](/mnt/d/mythOS/CAMIKEY/src/app/api/cron/payments/route.ts)
