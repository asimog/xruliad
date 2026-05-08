# DeepSeek V4 Pro Completion Plan

Date: 2026-05-07

## Current Repo Inventory

### Apps (5)
| App | Package Name | Framework | Status |
|-----|-------------|-----------|--------|
| apps/hypermyths | hypercinema | Next 16 + React 19 | Full app, video/worker/service routes |
| apps/hypertian | hypertian | Next 15 + React 18 | Full app, Farcaster + Solana ads |
| apps/cancerhawk | cancerhawk-web | Next 16 + Python/FastAPI | Full app, 166 tests |
| apps/polymyths | @hypermyths/polymyths | Next 16 + React 19 | Scaffold, minimal pages |
| apps/hyperkaon | @hypermyths/hyperkaon | Next 16 + React 19 | Scaffold, minimal pages |
| **apps/hashmyth** | — | — | **MISSING** |

### Packages (55)
All 55 packages exist with real implementations. Key ones:

| Package | Status | Notes |
|---------|--------|-------|
| theme | Complete | No `hashmyth` ProductId |
| hashmyth-video | Minimal | Only job preparation, not full video engine |
| openrouter | Partial | Key validation + config only. No real API calls |
| payments | Complete | pay.sh CLI boundary |
| platform-payments | Complete | Platform payment quotes |
| user-local-payments | Complete | User-local payment quotes |
| qvac | Partial | Health check only. No chat/embed calls |
| supabase | Complete | Config/boundary, no persistence helpers |
| belief-engine | Complete | Full belief lifecycle |
| unified-feed | Complete | Feed normalization with privacy |
| product-api | Complete | Health/capabilities/agent-run |
| **admin** | — | — | **MISSING** |

### Services (20)
| Service | Status | Notes |
|---------|--------|-------|
| hermes-worker | Demo script | Console output only, not HTTP server |
| video-worker | Boundary guard | Env check only |
| local-execution-gateway | Minimal | Status aggregation |
| terminal-api | Demo script | Example feed generation |
| qvac-gateway | Real HTTP server | Ollama proxy (70 lines) |
| github-worker | Stub | Typed, compiles |

## What Already Works

1. Monorepo builds: `pnpm install`, `pnpm build` (80/80 targets), `pnpm typecheck` (42 targets), `pnpm test` (17 targets) all pass
2. All 5 apps deploy independently with shared theme/fonts/visuals/music
3. Unified Feed normalization and privacy modes (local encrypted vs web transparent)
4. Belief Engine lifecycle (create → evidence → inference → payment → score → feed)
5. OpenRouter key validation and redaction (format only, no live API)
6. pay.sh platform/user-local payment separation (boundaries only, no live payments)
7. Local trading safety: `web_prepare_only` enforced, no live execution from web
8. Encrypt/Ika local fallbacks
9. QVAC gateway HTTP proxy to Ollama
10. Supabase: 10 migration files, RLS policies, typed boundaries
11. Product API: health, capabilities, agent-run for all 5 products

## What Is Missing / Needs Work

### Critical
1. **apps/hashmyth** — does not exist at all
2. **packages/admin** — does not exist at all
3. **packages/theme** — missing `hashmyth` ProductId
4. **packages/hashmyth-video** — too minimal, needs full video engine logic
5. **services/hermes-worker** — console demo, not HTTP server
6. **packages/openrouter** — no real API inference calls

### Important
7. README still maps HyperMyths as "gateway/video/media engine" — wrong
8. HyperMyths app still has `/media` as primary nav — needs terminal-first update
9. No Supabase persistence helpers (createJob, createFeedItem, etc.) — only config/boundary
10. No shared admin dashboard package
11. Product-specific agent tools are generic (same default tools for all products)
12. Belief engine is in-memory only, no server-backed flow
13. No final demo route

### Nice-to-have
14. QVAC only does health check, no chat/embed/model calls
15. Encrypt/Ika need real devnet integration (currently local fallback only)
16. Deployment docs need update for HashMyth + Hermes worker
17. No secret scan script

## Implementation Order

### 1. Theme/Product Map Update
- Add `hashmyth` to `ProductId`
- Add full HashMyth product token
- Update HyperMyths to terminal role
- Update all product metadata

### 2. Create apps/hashmyth
- Next.js 16 app with all required routes
- Landing page for video generation
- Create, Jobs, Templates, Feed, API Docs pages
- Admin dashboard mount
- API endpoints: health, capabilities, feed, video CRUD, agent/run, jobs, quote, execute

### 3. Upgrade packages/hashmyth-video
- Video job types (all input sources: token, wallet, X profile, thesis, research, ad, simulation)
- Script generation helpers
- Scene/shot/caption types
- Quote handling
- Payment integration
- Supabase job persistence
- Feed integration

### 4. Update apps/hypermyths (Terminal Role)
- Update routes: terminal-first landing
- Add /routes, /theses, /commands, /video (proxy to HashMyth), /intelligence, /ads, /research, /trade, /inference, /payments, /vault, /execute, /integrations, /setup, /beliefs, /memory, /github, /admin, /demo
- Update primary nav from "Open Studio" / "/media" to "Open Terminal" / "/terminal"
- Preserve existing behavior and routes

### 5. Upgrade services/hermes-worker (Fastify HTTP)
- HTTP server with Fastify
- All required endpoints (agent, commands, theses, beliefs, jobs, feed, video, ads, research, intelligence, simulation, payments, admin, setup)
- Supabase writes for all job types
- OpenRouter integration for inference
- Feed event emission

### 6. OpenRouter Live Inference
- `createChatCompletion()` with real `fetch` to OpenRouter API
- `streamChatCompletion()` if practical
- `testOpenRouterKeyLive()` — actual API call
- `getOpenRouterModels()` — list available models
- `estimateCost()` per model
- `recordOpenRouterUsage()` tracking

### 7. Pay.Sh Platform/User-Local Flows
- Complete platform payment execution
- Complete user-local payment execution
- Payment receipt persistence
- Feed payment badges
- Spend policy enforcement

### 8. Supabase Persistence Helpers
- `createJob()`, `updateJob()`, `getJob()`
- `createFeedItem()`, `createFeedEvent()`
- `createCommand()`, `createThesis()`
- `createBelief()`, `createBeliefUpdate()`
- `createPaymentReceipt()`
- `createInferenceReceipt()`
- `createModerationAction()`
- `createDisplayArtifact()`
- `createWalletSpawnIntent()`
- Typed errors for missing credentials

### 9. Shared Admin Dashboard (packages/admin)
- AdminShell, AdminAuthGate
- FeedModerationPanel, JobsPanel, AgentRunsPanel
- PaymentsPanel, WalletSpawnPanel
- SettingsPanel, DisplayApprovalPanel
- ProductSettingsPanel, RuntimeStatusPanel
- Mount /admin in every app

### 10. Product-Specific Agent APIs
- HashMyth: video.script, video.generate, video.fromToken, video.fromWallet, etc.
- Polymyths: thesis.create, prediction.analyze, etc.
- CancerHawk: research.quest.create, dataset.generate, etc.
- HyperKaon: simulation.create, physics.quest.create, etc.
- Hypertian: ad.campaign.create, stream.overlay.create, etc.
- HyperMyths Terminal: terminal.chat, terminal.route, etc.

### 11. Belief Engine Server-Backed Flow
- POST /beliefs, POST /beliefs/:id/run, POST /beliefs/:id/evidence, GET /beliefs/:id/timeline
- Supabase persistence
- OpenRouter inference
- Feed integration

### 12. Final Demo Route
- /demo/final in hypermyths
- Shows full flow: thesis → inference → payment → belief → video → ad → strategy seal → local trade intent

### 13. Documentation & Validation
- Update README with correct product map
- Update MIGRATION_STATUS.md
- Deployment docs for Vercel/Railway/Supabase
- Secret scan script
- Run all checks

## Dangerous Areas Not To Break

1. `apps/hypermyths/api/execute` — `executableOnWeb: false`, `requiresLocalExecutionGateway: true`
2. `packages/local-trading` — `web_prepare_only` enforced in check script
3. `packages/product-api/src/index.ts:69` — trade/execute → `local_only` status
4. Supabase forbidden stores — never add wallet keys, trading secrets
5. OpenRouter key logging — `assertOpenRouterKeyNotLogged` pattern
6. `.env.example` files — never commit real env files

## Final Target Structure

```
apps/
  hypermyths/    → hypermyths.com    (Terminal)
  hashmyth/      → hashmyth.com      (Video Engine)     ← NEW
  polymyths/     → polymyths.com     (Predictions)
  cancerhawk/    → cancerhawk.org    (Cancer Research)
  hyperkaon/     → hyperkaon.com     (Physics)
  hypertian/     → hypertian.com     (Ads)

packages/
  admin/                              (Shared Admin)    ← NEW
  hashmyth-video/                     (Video Engine)    ← UPGRADED
  openrouter/                         (Inference)       ← UPGRADED
  theme/                              (Products)        ← UPDATED
  supabase/                           (Persistence)     ← UPGRADED
  qvac/                               (Local AI)        ← UPGRADED
  ... (all other 50 packages unchanged)

services/
  hermes-worker/                      (HTTP Backend)    ← UPGRADED
  ... (all other 19 services preserved)
```

## Validation Checklist

- [ ] `pnpm install` passes
- [ ] `pnpm build` passes (all targets)
- [ ] `pnpm typecheck` passes (all targets)
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `apps/hashmyth` exists and builds
- [ ] HyperMyths is terminal-first
- [ ] HashMyth owns video logic
- [ ] Theme includes hashmyth
- [ ] Hermes worker is HTTP server
- [ ] OpenRouter makes real API calls
- [ ] pay.sh platform/user-local separated
- [ ] Supabase persistence helpers exist
- [ ] Admin dashboard shared package exists
- [ ] Product-specific APIs exist
- [ ] Final demo route exists
- [ ] No secrets committed
- [ ] README updated
- [ ] MIGRATION_STATUS updated

## Deployment Checklist

- [ ] One Vercel project per app
- [ ] Root Directory per app in Vercel configs
- [ ] One Railway Hermes worker
- [ ] One Supabase project
- [ ] Env vars per app/service documented
- [ ] Admin dashboard accessible in all apps
- [ ] Local trading safety preserved
