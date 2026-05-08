# CLAUDE.md — HyperMyths

Instructions for Claude Code working in this repository. Read this before touching any file.

---

## What This Repo Is

HyperMyths is a free AI video generation platform. Users submit an X (Twitter) profile, a Solana/EVM token contract address, or a creative prompt and receive an AI-rendered short film. There are no payments. No friction. The platform is rate-limited to keep it fair.

**Branded name:** HyperMyths  
**Internal package name:** hypercinema (legacy, do not rename)  
**Production domain:** hypermyths.com  
**Railway project ID:** c39ddbcd-87b3-4a55-90a9-6d9ff834206b

---

## Architecture at a Glance

```
Vercel (Next.js 16)          Railway (Docker)
├── app/                      ├── workers/server.ts   :8080
│   ├── api/video/create      ├── video-service/      :8090
│   ├── api/video/public-create   └── godmode (G0DM0D3) :7860
│   ├── /creator  ← Privy auth
│   ├── /login
│   └── /media    ← public
│
└── Supabase
    ├── PostgreSQL (DATABASE_URL)
    └── S3 storage (S3_* vars)
```

Two user tiers:
- **Free / public** — `/media`, `POST /api/video/public-create` — rate-limited, 2-act cinema only
- **Premium / authenticated** — `/creator`, `POST /api/video/create` — Privy auth, 3–10 act engine

---

## Critical Rules

### Never Do
- Do not add payment logic, wallet gates, or SOL/USDC pricing. Payments were fully removed.
- Do not use `@ts-ignore` or `as any` without a documented reason.
- Do not commit `.env*` files, secrets, or API keys. The secrets scanner runs on every push.
- Do not delete or alter `prisma/migrations/` — migrations are append-only.
- Do not change the `wallet` field semantics on `Job` — it is used as a routing key.
- Do not render text in videos. No captions, subtitles, or on-screen labels. Ever.
- Do not call `getEnv()` at module scope in a file that runs server-side under Next.js — call it inside the function. The one exception is workers where it is intentional.
- Do not use `after()` from `next/server` for Railway worker code — it works but add a comment explaining it is intentional.

### Always Do
- Run `npm run env:check` before deploying or testing env changes.
- Run `npm run secrets:scan` before committing if you touched `.env*` files.
- Use `trimOptionalEnvValue()` when reading optional env vars inside `getEnv()` — empty strings from Railway must be sanitised before Zod validation.
- Add `sceneCount: null` / `imageUrl: undefined` explicitly when building job documents for non-premium paths.
- Keep the `...process.env` spread in `getEnv()` — it is intentional for Railway env injection — but always add explicit overrides below it for any var that needs sanitisation.

---

## File Layout

```
app/                 Next.js App Router pages and API handlers
  api/
    video/create     POST — premium, Privy-auth, 3-10 act engine
    video/public-create  POST — free, rate-limited, 2-act only
    jobs/[jobId]/    GET, retry, trigger
    autonomous/      SSE feed
    worker/trigger   Worker dispatch (token-auth)
  creator/           Premium studio page (Privy-gated)
  login/             Privy sign-in + redirect to /creator
  media/             Free tier creator page
  feed/              Live job stream
  job/[jobId]/       Job status + video playback
  music/             MythX audio engine

components/          Client-side React components
  auth/              PrivyAppProvider, PrivyProtected, PrivyAccessPanel
  video/             VideoStudioForm — unified form for all input types
  cinema/            CinemaGeneratorClient
  chat/              CinemaConciergeChat
  job/               JobPageClient, JobCard
  music/             MythX player

lib/
  jobs/              State machine: repository, retry, trigger, trigger-soft
  video/             dispatcher.ts (provider chain), pipeline.ts, fal, replicate, xai, openrouter
  memecoins/         DexScreener metadata resolution
  auth/              privy-server.ts — server-side Privy verification
  security/          rate-limit.ts, request-ip.ts, crypto.ts
  ai/                cinematic.ts (script generation), report.ts
  storage/           s3.ts — upload, signed URLs, stream conversion
  env.ts             Zod schema for ALL environment variables
  env-validation.ts  assertRequiredEnvGroups() helper
  types/domain.ts    JobDocument, VideoDocument, ReportDocument, etc.

workers/
  process-job.ts     Main job execution — token, prompt, X profile paths
  multi-act-pipeline.ts  FFmpeg scene render + stitch
  server.ts          HTTP server (Railway :8080)
  mythx-engine.ts    MythX biography engine
  x-bot.ts           X/Twitter mention bot
  telegram-bot.ts    Telegram bot

video-service/       Optional standalone render microservice (:8090)

prisma/
  schema.prisma      Job, Report, Video, VideoRender, JobDispatchOutbox, etc.
  migrations/        Append-only — never edit existing migrations

tests/               Vitest regression suite
prompts/             Prompt templates (cinematic_prompt_template.md)
scripts/             validate-env.mjs, scan-secrets.mjs
```

---

## Job Lifecycle

```
pending → processing → [generating_script | generating_video | rendering_scenes | stitching_video | uploading_assets] → complete
                    ↘ failed
```

State transitions are atomic (`updateMany` with WHERE clause). Never call `updateJob` directly for status changes — use the state machine helpers in `lib/jobs/`.

The `JobDispatchOutbox` table drives worker polling. A new row is inserted with every job creation. The worker service polls this outbox, claims a row, and calls `processJob(jobId)`.

---

## Video Provider Chain

Priority order (configurable via `VIDEO_PROVIDER_PRIORITY` env var, default `openrouter`):

1. **OpenRouter** — `bytedance/seedance-1-5-pro` via OpenRouter API
2. **xAI** — `grok-imagine-video`
3. **Fal** — HuggingFace Wan2.1 via fal-ai inference
4. **Replicate** — various models
5. **HuggingFace** — direct inference API

All providers accept `imageUrl` for image-to-video. When a token contract address is submitted, the DexScreener image is passed as `imageUrl` to every scene render.

Dispatcher lives in `lib/video/dispatcher.ts`. Add new providers there. The fallback loop tries each provider in sequence and only throws if all fail.

---

## Environment Variables

All env vars are validated by a Zod schema in `lib/env.ts`. The schema is the source of truth — add vars there first, then use `getEnv()` in code.

**Key vars for local dev:**
```
DATABASE_URL             PostgreSQL (Supabase or local)
NEXT_PUBLIC_PRIVY_APP_ID Privy app ID (from Privy dashboard)
PRIVY_APP_SECRET         Privy app secret (server only)
PRIVY_JWT_VERIFICATION_KEY  Privy JWKS key (server only)
OPENROUTER_API_KEY       Primary video + text provider
XAI_API_KEY              xAI video fallback
S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY  Supabase S3
WORKER_TOKEN             Shared secret for /api/worker/trigger
APP_BASE_URL             Canonical URL (http://localhost:3000 for dev)
ALLOW_IN_PROCESS_WORKER  true — run worker in-process for local dev
```

Copy `.env.example.railway` to `.env.local` and fill required vars. Run `npm run env:check` to validate.

---

## Authentication

- `lib/auth/privy-server.ts` — `requirePrivyAuth(request)` returns `{ ok: true, session }` or a 401 NextResponse
- Premium routes call `requirePrivyAuth` at the top of the handler
- Public routes skip auth but enforce rate limits via `enforceRateLimit()`
- `PRIVY_APP_SECRET` + `PRIVY_JWT_VERIFICATION_KEY` must both be set for server-side verification

---

## Testing

```bash
npm test                 # full Vitest suite
npm run test:watch       # watch mode
npm run test:live        # external smoke tests (requires real API keys)
```

Tests live in `tests/`. Most are unit/integration. Live tests hit real providers.

After changes to `lib/video/` or `workers/`, run at minimum:
```bash
npm test tests/video-service.render-retry.test.ts
```

---

## Common Tasks

### Add a new video provider
1. Create `lib/video/my-provider.ts` with a `generateMyVideo(params)` function
2. Add it to the `VideoProvider` union type in `lib/video/dispatcher.ts`
3. Add a case in `generateVideoWithProvider()` switch
4. Add the provider to the fallback chain logic in `renderCinematicVideoWithFallback()`
5. Add env vars to `lib/env.ts` schema and `getEnv()` input object

### Add a new env var
1. Add to `envSchema` in `lib/env.ts`
2. Add to the `safeParse({...})` input object in `getEnv()` using `trimOptionalEnvValue()`
3. Add to `.env.example.railway`
4. Add to `lib/env-validation.ts` group if it is required for a service group

### Add a new API route
1. Create `app/api/my-route/route.ts` with `export const runtime = "nodejs"`
2. Add Privy auth if it is a premium route, rate limiting if it is public
3. Document it in `docs/ROUTES_AND_OPERATIONS.md`

### Run a database migration
```bash
# Local dev — creates migration file:
npx prisma migrate dev --name describe_the_change

# Production — applies pending migrations:
npx prisma migrate deploy
```

Never hand-edit existing migration files. Always create a new migration.

---

## Deployment

- **Railway** — auto-deploys on push to `main`. See `RAILWAY.md`.
- **Vercel** — auto-deploys on push. See `DEPLOY.md`.
- **Migrations** — run `npx prisma migrate deploy` after any schema change.
- **Secrets scan** — runs automatically on push via `.github/workflows/security-checks.yml`.

Full deployment walkthrough: `DEPLOY.md`  
Railway service config + env matrix: `RAILWAY.md`

---

## What Was Removed (Do Not Re-Add)

- Firebase / Firestore / Firebase Storage
- Solana payment flows, dedicated payment addresses
- x402 micropayment protocol
- Helius SDK
- QR code payment UI
- Discount codes, promo codes (schema tables remain for historical data, do not reactivate)
- Admin cockpit (removed — admin operations via direct DB or Railway CLI)
