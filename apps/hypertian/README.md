# Hypertian

## What This Repo Is

Hypertian is a Next.js 15 App Router app for crypto-native livestream ad inventory.

The current codebase supports two active lanes:

- `X Ads`: a tightly controlled overlay lane for a single X account
- `PumpAds`: a broader creator/sponsor workflow for Pump streamers

At a high level, the app does four things:

- lets Privy-authenticated creators register streams and payout wallets
- lets sponsors create chart or banner ad campaigns for a stream
- verifies SOL payments on Solana before activating campaigns
- renders live overlays with DexScreener token context plus approved ad content

## Codebase Snapshot

The repo is already past prototype stage. The core runtime is present and wired:

- Next.js pages and App Router API handlers in `src/app`
- Supabase-backed persistence via `src/lib/supabase/*`
- Privy-backed auth gates in `src/components/providers.tsx` and `src/lib/privy.ts`
- Solana payment routing and verification in `src/lib/payment-routing.ts`, `src/lib/payments.ts`, and `src/lib/solana.ts`
- DexScreener search and pair lookups in `src/lib/dexscreener.ts`

A few important realities from the current code:

- the README that shipped with the repo was stale
- the product surface is now intentionally limited to `X Ads` and `PumpAds`
- overlays now use signed heartbeat keys instead of unauthenticated pings
- payment verification returns a minimal public status payload instead of raw payment rows
- escrow-style deposit keys are encrypted at rest and verified escrow balances are swept automatically
- the active banner flow expects an HTTPS banner URL, while Filebase support remains optional through presigned upload URLs

## Current Routes

### App routes

- `/`
- `/streams`
- `/x-overlay`
- `/pump`
- `/pump-overlay`
- `/overlay/[streamId]`
- `/dashboard/streamer`
- `/dashboard/sponsor`

### API routes

- `GET/POST /api/streams`
- `POST /api/streams/heartbeat`
- `GET/POST /api/ads`
- `POST /api/ads/review`
- `POST /api/payments/verify`
- `POST /api/auth/sync`
- `GET /api/dashboard/streamer`
- `GET /api/dashboard/sponsor`
- `GET /api/dex/search`
- `GET /api/dex/pair`
- `GET /api/cron/payments`
- `POST /api/filebase/upload-url`

## Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS 4
- Supabase
- Privy
- Solana Web3.js
- DexScreener
- Vitest

## Required Environment Variables

For a full operator deployment, these are the env vars that matter most:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# legacy fallback if you are not using the newer publishable key:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA=
HELIUS_RPC_URL=
```

Useful but optional:

```bash
PRIVY_VERIFICATION_KEY=
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_SITE_URL=
CRON_SECRET=
OVERLAY_SIGNING_SECRET=
ESCROW_ENCRYPTION_SECRET=
FILEBASE_ACCESS_KEY_ID=
FILEBASE_SECRET_ACCESS_KEY=
FILEBASE_BUCKET=
NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL=
```

## Where To Get Each Key

| Variable | Required | What it does in this repo | Where to get it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server Supabase client base URL | Supabase project dashboard. See Project Settings / API or the project Connect dialog. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public browser key for Supabase client access | Supabase Project Settings / API Keys. Prefer the publishable key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional legacy fallback | Used only if you do not have a publishable key wired yet | Supabase Project Settings / API Keys / Legacy API Keys. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin client for writes, payment state, dashboards, and stream/ad management | Supabase Project Settings / API Keys / Legacy API Keys. Copy the `service_role` key and keep it server-only. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes for auth flows | Enables the Privy React provider and backend token verification | Privy Dashboard / Configuration / App settings / Basics. |
| `PRIVY_APP_SECRET` | Yes for auth flows | Backend secret used for Privy server verification fallback | Privy Dashboard / Configuration / App settings / Basics. |
| `PRIVY_VERIFICATION_KEY` | Optional but recommended | Lets the backend verify Privy access tokens without an extra key fetch path | Privy Dashboard / Configuration / App settings / Basics, under the verification key area. |
| `NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA` | Yes for Pump commission routing | Public Solana address that receives platform fees for Pump ads | Generate or choose your own platform treasury wallet in Phantom, Solflare, Backpack, or a hardware-wallet-backed treasury setup. This is your wallet address, not a vendor-issued key. |
| `HELIUS_RPC_URL` | Strongly recommended | Preferred Solana RPC endpoint for payment verification | Helius dashboard. Create an endpoint in the Endpoints section and copy its URL. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Optional fallback | Client-side/public fallback RPC URL | Your chosen Solana RPC provider. Can also be another Helius endpoint if you want a public read URL. |
| `CRON_SECRET` | Optional | Protects `GET /api/cron/payments` | Generate it yourself with `openssl rand -hex 32` or an equivalent secret generator. |
| `OVERLAY_SIGNING_SECRET` | Optional but recommended | Signs per-stream overlay heartbeat keys | Generate it yourself with `openssl rand -hex 32`. If omitted, the app falls back to `SUPABASE_SERVICE_ROLE_KEY`, but a dedicated secret is better. |
| `ESCROW_ENCRYPTION_SECRET` | Optional but recommended | Encrypts escrow deposit secrets before they are stored | Generate it yourself with `openssl rand -hex 32`. If omitted, the app falls back to an existing server secret, but a dedicated secret is better. |
| `FILEBASE_ACCESS_KEY_ID` | Optional | Enables presigned upload URLs for Filebase-backed banner uploads | Filebase account credentials dashboard. |
| `FILEBASE_SECRET_ACCESS_KEY` | Optional | Secret half of Filebase S3 credentials | Filebase account credentials dashboard. |
| `FILEBASE_BUCKET` | Optional | Target Filebase bucket for uploads | A bucket you create in Filebase. |
| `NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL` | Optional | Public base URL used to construct uploaded asset URLs | Usually your Filebase bucket URL, for example `https://<bucket>.s3.filebase.com`. |

Official references:

- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Privy app ID and app secret: https://docs.privy.io/api-reference/introduction
- Privy verification key guidance: https://docs.privy.io/guide/server/authorization/verification
- Privy optimization note for copied verification keys: https://docs.privy.io/recipes/dashboard/optimizing
- Helius RPC endpoint setup: https://www.helius.dev/docs/rpc/overview/

## Local Setup

### 1. Install dependencies

```bash
npm install
```

Node.js `>=20` is required.

### 2. Create and configure Supabase

Create a Supabase project, then apply all migrations in order:

```text
supabase/migrations/001_initial.sql
supabase/migrations/002_payment_deposits.sql
supabase/migrations/003_ad_ownership.sql
supabase/migrations/004_open_livestream_ads.sql
supabase/migrations/005_payment_routing_commissions.sql
```

### 3. Add env vars

Create `.env.local` and add the required variables listed above.

### 4. Run the app

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run pipeline
```

`npm run pipeline` runs:

- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Operational Flow

### Creator flow

1. A user authenticates with Privy.
2. The frontend syncs the user through `POST /api/auth/sync`.
3. The creator registers a stream through `POST /api/streams`.
4. The app returns a signed overlay URL for that stream.
5. The overlay heartbeats through `POST /api/streams/heartbeat` with its signed key.

### Sponsor flow

1. A sponsor chooses a stream in the sponsor dashboard.
2. `POST /api/ads` validates the token or banner input and creates the ad plus payment record.
3. The sponsor sends SOL to the returned deposit address.
4. `POST /api/payments/verify` verifies the transaction signature on Solana.
5. If the payment used an escrow deposit address, the backend sweeps the verified balance automatically.
6. Chart ads can activate immediately after payment verification.
7. Banner ads move to streamer approval and are finalized through `POST /api/ads/review`.

### Payment routing

- non-banner, non-Pump ads can route directly to the streamer wallet
- banner ads use escrow-style generated deposit addresses
- escrow deposit secrets are encrypted at rest
- verified escrow balances are swept automatically after verification
- Pump ads apply a platform commission and require `NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA`

## Verification

Use these before shipping changes:

```bash
npm run pipeline
npm run build
```

## Deployment Notes

- Vercel deployment is supported by `vercel.json`
- `GET /api/cron/payments` is protected by `Authorization: Bearer $CRON_SECRET`
- Supabase `pg_cron` runs `poll-pending-payments` every 5 minutes and calls the protected cron route
- `HELIUS_RPC_URL` should be treated as the production RPC for payment verification
- `OVERLAY_SIGNING_SECRET` and `ESCROW_ENCRYPTION_SECRET` should be set explicitly in production
- Filebase uploads are optional and separate from the default HTTPS banner URL flow

## Extra Docs

- [CODE_INDEX.md](/mnt/d/mythOS/CAMIKEY/CODE_INDEX.md)
- [docs/MIGRATION_NOTES.md](/mnt/d/mythOS/CAMIKEY/docs/MIGRATION_NOTES.md)
- [docs/OPERATOR_GUIDE.md](/mnt/d/mythOS/CAMIKEY/docs/OPERATOR_GUIDE.md)
