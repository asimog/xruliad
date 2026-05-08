# Migration Notes

## Current State

The repo is no longer a partial migration shell. It is now a functioning Hypertian codebase with:

- a Next.js App Router frontend
- overlay routes for X, YouTube, Twitch, and Pump.fun
- streamer and sponsor dashboards
- Supabase-backed persistence and storage
- optional Privy-based auth and user sync
- generated Solana deposit addresses for sponsor funding
- DexScreener-backed token validation and chart data

## What Changed From The Earlier Repo Direction

- Firebase-era config and hosting assumptions are out of the active runtime path.
- The package/app identity is now `hypertian`.
- Shared overlay primitives are centralized in reusable components:
  - `DexChart`
  - `MediaBanner`
  - `OverlayDisclosure`
  - `OverlaySurface`
- Dashboard behavior now splits along two distinct operator roles:
  - streamer
  - sponsor
- Supabase is the system of record for:
  - users
  - streams
  - ads
  - media jobs
  - payments
- Sponsor activation is tied to generated Solana deposit addresses and payment verification.

## Database Reality

The authoritative schema lives in:

- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_payment_deposits.sql`

`002_payment_deposits.sql` is intentionally additive so projects that were provisioned before deposit-address support can be updated safely.

## Auth Reality

- Privy is optional at boot time.
- Stream creation and auth sync depend on Privy when those flows are used.
- Sponsor-side ad creation does not require Privy in the current UI flow.

## Overlay Reality

- `/x-overlay` is still the most polished route and the clearest production target.
- The other overlay routes share the same rendering engine and differ mainly by route namespace/platform context.
- Overlay URLs support standard single-slot query params today, and the repo also contains a CSV-style parser for future or advanced multi-slot composition.

## Documentation Entry Points

For the current repo shape, start with:

- `README.md`
- `CODE_INDEX.md`
- `docs/MIGRATION_NOTES.md`
