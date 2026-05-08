# HyperMyths Monorepo

HyperMyths is a market network for attention, intelligence, research, simulation, and computation.

One shared visual system. One shared music orb. One shared intelligence engine. Multiple product-specific domains.

## Product Map

- HyperMyths (`hypermyths.com`): gateway, token scanner, AI media/video engine, wallet/X/profile intelligence.
- Hypertian (`hypertian.com`): livestream ads, creator monetization, transparent ad overlays, attention market.
- CancerHawk (`cancerhawk.org`): biomedical synthetic data quests and careful public-good research workflows.
- HyperKaon (`hyperkaon.com`): physics simulation, synthetic physics data, compute quests.
- Polymyths (`polymyths.com`): prediction, intelligence, scenario analysis, narrative theses.

## Memory & Storage

HyperMyths uses Supabase Postgres as the structured agent memory layer. Cloud Supabase stores web-safe commands, theses, jobs, receipts, and display artifacts. Local Supabase can run as the private MythVault for trading-sensitive strategies, QVAC memory, local execution intents, and user-local payment receipts. GitHub is used as the agent-editable code and artifact ledger: generated outputs can be published to allowlisted paths, while source-code edits go through branches and pull requests.

### Memory checks

```bash
pnpm memory:local:check
pnpm memory:cloud:check
pnpm memory:policy:test
pnpm memory:sync:test
pnpm vector-memory:test
pnpm github:check
pnpm github:policy:test
pnpm github:artifact:test
pnpm artifact-ledger:test
pnpm agent-memory:test
```

## Unified Feed

The HyperMyths Unified Feed shows jobs across every product: intelligence, predictions, videos, ads, research, simulations, code, payments, and local execution intents. Web jobs are transparent by default, including platform payment receipts and sponsored ad metadata. Local jobs can publish privacy-preserving envelopes: creator identity is encrypted or pseudonymous, sensitive content is redacted or encrypted, and trading/execution details remain local unless the user explicitly publishes them.

```bash
pnpm feed:check
pnpm feed:privacy:test
pnpm feed:schema:test
pnpm feed:sync:test
```

## Belief Engine

HyperMyths includes an RBM-inspired Belief Engine: every command or thesis produces visible learning frames as evidence, inference, paid APIs, simulations, and contributions update confidence over time. The system does not use the old RBM repo as a dependency; it borrows the idea of visible training/progress and applies it to market intelligence, research, video, ads, and local trade intents. A user can run the simplified system with an OpenRouter API key and pay.sh wallet, while QVAC/local services remain optional for private workflows.

```bash
pnpm belief-engine:test
pnpm openrouter:byok:test
pnpm paysh:simple:test
pnpm setup:check
pnpm rbm-belief-demo:check
```

```text
apps/       independently deployable product apps
packages/   shared UI, theme, visuals, music, intelligence, payments, simulation, agents, markets, wallet, auth, analytics, config, types
services/   backend and worker process boundaries
infra/      deployment and integration notes
docs/       architecture, ecosystem, deployment, integrations, visual system, intelligence engine
```

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
pnpm dev:hypertian
pnpm dev:cancerhawk
pnpm dev:hyperkaon
pnpm dev:polymyths
```

Integration checks:

```bash
pnpm paysh:check
pnpm miroshark:check
pnpm moto:check
```

## Deployment

Each app should be deployed independently:

- `apps/hypermyths` -> `hypermyths.com`
- `apps/hypertian` -> `hypertian.com`
- `apps/cancerhawk` -> `cancerhawk.org`
- `apps/hyperkaon` -> `hyperkaon.com`
- `apps/polymyths` -> `polymyths.com`

## Shared Systems

- Visual system: `packages/theme`, `packages/fonts`, `packages/visuals`, `packages/ui`.
- MusicOrb: `packages/music-orb`, default muted/visual-only until user interaction.
- Intelligence engine: `packages/intelligence` and `services/intelligence-worker`.
- pay.sh: `packages/payments` with real 402/x402/CLI boundary and spend checks.
- MiroShark: `packages/simulation` with external/local service boundary.
- moto/fstack: `packages/agents` with workflow definitions and setup checks.

The philosophy is one platform, many market-facing apps.

## Final Local/Web Split

HyperMyths Terminal runs on the web, locally, or in hybrid mode. The web app provides video, intelligence, ads, research, thesis creation, and command collaboration. Trading remains local: the web prepares intents, while user keys, user-local pay.sh, and live execution stay on the user's machine. Platform payments use pay.sh transparently and fairly. QVAC is used when available for private local reasoning, while cloud-safe tasks can route to the cheapest capable provider.

One terminal.
Many engines.
Trading local.
Everything else web.
Transparent pay.sh payments.
Cheapest safe inference for every command.

Additional checks:

```bash
pnpm runtime:check
pnpm privacy:test
pnpm qvac:check
pnpm platform-payments:check
pnpm user-local-payments:check
pnpm x402scan:check
pnpm inference:test
pnpm command-protocol:test
pnpm thesis-engine:test
pnpm local-trading:check
pnpm execution:safety:test
pnpm encrypt:check
pnpm ika:check
pnpm display:test
pnpm hackathon:check
pnpm final-demo:check
```
