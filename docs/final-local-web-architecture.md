# Final Local/Web Architecture

## Current Repo State

The current repo is `C:\SessionMint\hypermyths-monorepo`. The prior migration is complete and should not be restarted.

Implemented apps:

- `apps/hypermyths`: migrated HyperMyths web app, currently the Terminal/HashMyth host surface.
- `apps/hypertian`: migrated Hypertian app for livestream ads and attention markets.
- `apps/cancerhawk`: migrated CancerHawk app for research quests and Python research workflows.
- `apps/hyperkaon`: new scaffold for physics simulation and compute quests.
- `apps/polymyths`: new scaffold for thesis, prediction, and intelligence.

Implemented packages:

- `theme`, `types`, `fonts`, `visuals`, `music-orb`, `ui`
- `auth`, `wallet`, `database`, `ai`, `agents`, `intelligence`, `simulation`, `payments`, `media`, `markets`, `tokens`, `analytics`, `config`

Implemented services:

- `api`, `video-worker`, `ad-server`, `synthetic-data-worker`, `simulation-worker`, `intelligence-worker`

Not yet implemented before this pass:

- dedicated `apps/hypermyths-terminal`
- dedicated `apps/hashmyth`
- runtime/privacy/local trading packages
- platform/user-local payment plane split
- product API standard package
- command/thesis protocol packages
- inference router package/service
- QVAC gateway package/service
- Encrypt/Ika typed boundaries
- local execution/payment gateways

QVAC reference state:

- `C:\qvacenterprise` exists locally and contains QVAC SDK source, docs, architecture notes, and examples.
- It does not contain a root `package.json`, so this repo should not depend on it as a workspace package.
- Use it as local reference material. Runtime integration should remain optional through `QVAC_BASE_URL`, `QVAC_GATEWAY_URL`, and OpenAI-compatible HTTP boundaries.

## Final Architecture Target

HyperMyths Terminal is the command center. It runs on the web, locally, or in hybrid mode. The web app provides video, intelligence, ads, research, thesis creation, and command collaboration. Trading remains local: the web prepares intents, while user keys, user-local pay.sh, and live execution stay on the user's machine. Platform payments use pay.sh transparently and fairly. QVAC is used when available for private local reasoning, while cloud-safe tasks can route to the cheapest capable provider.

One terminal.
Many engines.
Trading local.
Everything else web.
Transparent pay.sh payments.
Cheapest safe inference for every command.

## Product Roles

- HyperMyths.com: Terminal, chat command center, route planner, product router, local/hybrid bridge.
- HashMyth.com: video generation engine, agent-callable and web-accessible.
- Polymyths.com: thesis, prediction, market intelligence, scenario analysis.
- CancerHawk.org: research intelligence and synthetic data quests with no treatment claims.
- HyperKaon.com: physics research, simulation intelligence, compute/simulation quests.
- Hypertian.com: ads, attention markets, livestream overlays, campaign intelligence.

## Trading-Local Meaning

Trading-local means:

- User trading keys stay local.
- User execution credentials stay local.
- Live order placement stays local.
- Private strategy execution stays local.
- User-paid trading-related pay.sh/x402 actions stay local.
- User approvals happen locally.
- Local terminal or local companion agent performs execution.
- Web can prepare, simulate, explain, and display trade theses, but cannot execute user trades.

Default execution mode is `web_prepare_only`.

Allowed execution modes:

- `web_prepare_only`
- `local_paper`
- `local_devnet`
- `local_live_user_approved`

## Memory Architecture (Added Pass 2)

HyperMyths uses Supabase Postgres as the structured agent memory layer:

- **Cloud Supabase**: web-safe commands, theses, jobs, receipts, display artifacts.
- **Local Supabase**: private MythVault for strategies, local trading, QVAC logs, user-local payments.
- **GitHub**: agent-editable code and artifact ledger — publish generated outputs to allowed paths, code edits through PRs.
- **QVAC**: local/private embeddings over local memory.
- **OpenRouter/cloud**: web-safe embeddings for public/shared memory.

### Memory Packages

- `packages/supabase` — cloud/local client selection, forbidden-store detection, service-role browser guard.
- `packages/agent-memory` — structured memory routing, visibility/privacy policy, sync approval.
- `packages/vector-memory` — text chunking, embedding provider selection, pgvector types, search interfaces.
- `packages/github-agent` — GitHub App auth, path policy enforcement, artifact publish and code PR creation.
- `packages/artifact-ledger` — artifact provenance, publish/PR creation with policy enforcement.
- `packages/memory-sync` — local-to-cloud sync queue, block-forbidden, redaction before sync.

### Supabase Migrations

8 migration files created under `supabase/migrations/`:
- Core identity + pgvector (0001)
- Agent memory tables (0002)
- Commands + theses tables (0003)
- Jobs tables (0004)
- Payments, receipts, approvals, audit (0005)
- GitHub/code tables (0006)
- Display, storage, provider config (0007)
- RLS policies (0008)

### Terminal Routes

- `/memory` — agent memory overview
- `/github` — GitHub agent status
- `/settings/memory` — memory configuration

### Services

- `services/github-worker` — GitHub agent service stub

## Web-Available Meaning

Web-available means:

- Terminal chat works in web mode.
- Product routing and capabilities are visible.
- Theses and commands can be created, run, displayed, and contributed to.
- Video, intelligence, ads, research, simulation, and display artifacts can be requested by users or authorized agents.
- Cloud-safe inference can use OpenRouter, x402 APIs, Dexter/OpenDexter, pay.sh platform APIs, cached results, or user-approved providers.
- QVAC and local trading can be unavailable without blocking web-safe features.

If local services are unavailable, the UI and APIs report:

- local QVAC unavailable
- local trading unavailable
- user-local payments unavailable
- web-safe features available
- connect local gateway for private/trading features

## Platform pay.sh vs User-Local pay.sh

Platform payment plane:

- Server-side platform wallet/account.
- Used for web video, ads, research, simulation, intelligence, and premium platform features.
- Produces transparent quotes and receipts.
- Can run on Railway/server-side infrastructure.
- Must not use user trading wallets.

User-local payment plane:

- Runs locally.
- User wallet/keys stay local.
- Used for local trading-related paid tools, private data calls, and user agent purchases.
- Receipts are local unless the user chooses to display them.
- Must not run through platform servers.

These planes are intentionally separate. Platform `PLATFORM_PAYSH_*` env must never be mixed with local `USER_PAYSH_*` env.

## Agents, Commands, And Theses

A Command is an executable or collaborative unit of work.

A Thesis is a structured claim/hypothesis that can be researched, simulated, displayed, turned into media, used for ads, or exported as a local-only trade intent.

Users and user agents can:

- create theses
- run theses from our model
- contribute evidence
- contribute model outputs
- contribute ads
- contribute videos
- contribute research tasks
- contribute simulations
- contribute code/reviews/tests
- request quotes
- request display
- export local trade intents

Paid actions produce pay.sh quotes and receipts. Sensitive/private actions require approval. Trading execution exports an intent and requires local execution.

## Hackathon-Critical Loop

The demo loop:

1. Create a market thesis.
2. Use cheapest safe inference for public parts.
3. Use QVAC for private reasoning if available.
4. Quote paid APIs with pay.sh.
5. Seal the thesis with Encrypt boundary or local fallback.
6. Generate a HashMyth video script.
7. Create a Hypertian ad concept.
8. Prepare a local-only trade intent without executing it.
9. Show Ika policy/signing intent preview.
10. Log audit receipts for every step.

Hackathon-critical pieces:

- runtime/local/web/hybrid mode reporting
- privacy routing
- QVAC optional boundary
- platform pay.sh quote boundary
- user-local pay.sh local-only boundary
- command/thesis typed protocol
- video/intelligence/ads display request APIs
- Encrypt/Ika typed boundaries with honest fallback status
- local execution gateway that refuses live execution without local approval

## What Can Remain Stubbed But Typed

The following may remain typed stubs if credentials or external systems are unavailable:

- QVAC runtime calls
- Encrypt devnet writes
- Ika dWallet policy enforcement
- MiroShark live simulation calls
- pay.sh live settlement
- x402 live paid requests
- Dexter/OpenDexter provider calls
- Supabase command/thesis persistence
- Railway worker deployment
- local exchange/venue adapters

Stubs must fail clearly or return `unavailable`, `requires_setup`, or `local_only` statuses. They must not fake success.

## Implementation Checklist

- Create runtime/privacy packages.
- Create local trading, execution, risk, audit, strategy vault packages.
- Create local execution gateway service.
- Split platform and user-local payment packages/services.
- Create product API standard package.
- Create command protocol and thesis engine packages/services.
- Create display/hashmyth-video/ads packages and display/command/platform payment services.
- Create inference router package/service.
- Create QVAC package/service boundary.
- Create Encrypt/Ika packages and docs.
- Add Terminal routes and demo route in `apps/hypermyths`.
- Add agent-callable API routes to products or a shared route manifest.
- Update env examples, scripts, docs, README, and migration status.
- Run install, lint, typecheck, build, checks, and server startup.

## Risks And Missing Setup

- QVAC is local reference only unless `QVAC_GATEWAY_URL` or `QVAC_BASE_URL` points to a running service.
- Live pay.sh calls require real wallet/API setup.
- User-local pay.sh must not be deployed publicly.
- Local trading adapters are safe boundaries by default; live venue adapters require manual implementation and user approval.
- Encrypt/Ika are hackathon-critical but unavailable until devnet/program details are supplied.
- Supabase tables for commands/theses/display artifacts still need migration files before durable production storage.
- Product APIs may start as typed route contracts before every product has full persistence.

## Final Validation Checklist

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm runtime:check`
- `pnpm privacy:test`
- `pnpm qvac:check`
- `pnpm platform-payments:check`
- `pnpm user-local-payments:check`
- `pnpm paysh:check`
- `pnpm x402scan:check`
- `pnpm inference:test`
- `pnpm command-protocol:test`
- `pnpm thesis-engine:test`
- `pnpm local-trading:check`
- `pnpm execution:safety:test`
- `pnpm encrypt:check`
- `pnpm ika:check`
- `pnpm display:test`
- `pnpm hackathon:check`
- `pnpm final-demo:check`
- start the HyperMyths web server with available `.env.local` values loaded
