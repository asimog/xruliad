# HyperMyths Monorepo

HyperMyths Terminal runs on the web, locally, or in hybrid mode: trading stays local, HashMyth owns video, intelligence/ads/research run on the web, platform payments use pay.sh transparently, user-local payments stay private, and every command routes to the cheapest safe inference available.

## Product Map

- **HyperMyths.com** — Terminal / command center / route planner. One terminal to operate everything.
- **HashMyth.com** — Dedicated video engine. Owns token-to-video, wallet-to-video, X-profile-to-video, thesis-to-video, research-to-video, ad-to-video, script-to-video.
- **Polymyths.com** — Prediction, market intelligence, scenario analysis, theses.
- **CancerHawk.org** — Cancer research intelligence and synthetic data quests.
- **HyperKaon.com** — Physics research, simulation intelligence, compute quests.
- **Hypertian.com** — Ads, attention markets, livestream overlays, campaign/display intelligence.

## Architecture

```
Monorepo (pnpm + Turborepo)
├── apps/
│   ├── hypermyths/    → hypermyths.com  (Terminal)
│   ├── hashmyth/      → hashmyths.com   (Video Engine)
│   ├── polymyths/     → polymyths.com   (Predictions)
│   ├── cancerhawk/    → cancerhawk.org  (Cancer Research)
│   ├── hyperkaon/     → hyperkaon.com   (Physics)
│   └── hypertian/     → hypertian.com   (Ads)
├── packages/            Shared packages (theme, UI, beliefs, feed, payments, video, etc.)
├── services/
│   └── hermes-worker/   Shared HTTP backend (Railway)
└── supabase/            Database migrations
```

## Deployment

- **Vercel** deploys every website from the monorepo (6 apps)
- **Railway** runs one shared Hermes worker backend
- **Supabase** is the database for jobs, feed, memory, commands, theses, admin, receipts, artifacts
- **OpenRouter** is the primary cloud inference provider, with BYOK support
- **pay.sh** is used for transparent platform payments and user-local payments
- **QVAC** is optional/local/hybrid for private reasoning when available
- **Trading** stays local. The web can prepare/export trade intents but cannot execute live trades.

## Setup

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

App-specific development:

```bash
pnpm dev:hypermyths
pnpm dev:hashmyth
pnpm dev:hypertian
pnpm dev:cancerhawk
pnpm dev:hyperkaon
pnpm dev:polymyths
pnpm dev:hermes-worker
```

Integration checks:

```bash
pnpm paysh:check
pnpm belief-engine:test
pnpm feed:check
pnpm openrouter:byok:test
pnpm admin:check
pnpm hashmyth:check
pnpm hackathon:check
pnpm final-demo:check
```

## Shared Systems

- Visual system: `packages/theme`, `packages/fonts`, `packages/visuals`, `packages/ui`.
- MusicOrb: `packages/music-orb`, default muted/visual-only until user interaction.
- Intelligence engine: `packages/intelligence` and `services/intelligence-worker`.
- Video engine: `packages/hashmyth-video` and `apps/hashmyth`.
- pay.sh: `packages/payments`, `packages/platform-payments`, `packages/user-local-payments`.
- Belief Engine: `packages/belief-engine` with OpenRouter inference integration.
- OpenRouter: `packages/openrouter` with real API inference calls.
- Hermes Worker: `services/hermes-worker` — shared Fastify HTTP backend for all products.
- Admin Dashboard: `packages/admin` — shared admin shell for all apps.

## Local/Web Split

HyperMyths Terminal runs on the web, locally, or in hybrid mode. The web app provides terminal/command center, routes to all products, intelligence, ads, research, thesis creation, and command collaboration. Trading remains local: the web prepares intents, while user keys, user-local pay.sh, and live execution stay on the user's machine. Platform payments use pay.sh transparently and fairly. QVAC is used when available for private local reasoning, while cloud-safe tasks can route to the cheapest capable provider.

One terminal.
Many engines.
Trading local.
Everything else web.
Transparent pay.sh payments.
Cheapest safe inference for every command.
