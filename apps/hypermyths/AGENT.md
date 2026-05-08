# AGENT.md — HyperMyths

Instructions for AI coding agents (Codex, Claude Code, Cursor, Aider, etc.) working in this repository. This file is the agent's operating contract. Read it fully before making any changes.

---

## Project Identity

| Field | Value |
|-------|-------|
| Product name | HyperMyths |
| Package name | hypercinema (do not rename) |
| Domain | hypermyths.com |
| Stack | Next.js 16 + Railway + Supabase |
| Language | TypeScript (strict) |
| Node version | 22 (Alpine in Docker) |

---

## Mission

Build and maintain a **free AI video generation platform**. Users input an X profile handle, a token contract address, or a creative prompt. The platform renders a short cinematic film using a chain of AI video providers.

**Hard constraints:**
- No payments. No monetization. No wallet gates. These were deliberately removed.
- No text rendered in videos — no captions, no subtitles, no labels.
- Free tier is always available at `/media`. Premium is Privy-authenticated at `/creator`.

---

## Before You Start Any Task

1. Read `CLAUDE.md` — critical rules for this codebase.
2. Read `lib/env.ts` — understand the environment schema before touching config.
3. Read `lib/types/domain.ts` — understand the core data types.
4. Check `prisma/schema.prisma` — understand the database structure.
5. Run `npm run env:check` to confirm the environment is valid.

---

## How to Approach Tasks

### Scope Control
- Make the **smallest coherent edit** that satisfies the requirement.
- Do not refactor surrounding code unless it is directly blocking the task.
- Do not add abstractions, helpers, or utilities that are not immediately needed.
- Do not add comments explaining what code does — use clear names instead.
- Only add a comment when the WHY is non-obvious (a workaround, a subtle invariant, a hidden constraint).

### Research First
Before writing code for any non-trivial change:
1. Find the existing implementation — search with Grep before inventing.
2. Trace the data flow end-to-end (UI → API → worker → provider → storage).
3. Identify which tests cover the area you are changing.

### Verify Before Claiming Done
- Run `npm test` after any change to `lib/video/`, `lib/jobs/`, `workers/`, or `lib/auth/`.
- Run `npm run env:check` after any change to `lib/env.ts`.
- Run `npm run secrets:scan` if you touched any `.env*` file.
- If changing a route, confirm the response shape matches what the client expects.

---

## Data Flow Reference

### Premium job creation (contract address → video)
```
POST /api/video/create
  → requirePrivyAuth()           lib/auth/privy-server.ts
  → resolveMemecoinMetadata()    lib/memecoins/metadata.ts  ← DexScreener
  → createTokenVideoJob()        lib/jobs/repository.ts
  → triggerJobProcessingSoft()   lib/jobs/trigger-soft.ts

Worker polls JobDispatchOutbox
  → processJob(jobId)            workers/process-job.ts
  → processTokenVideoJob()
    → resolveSceneCount()        uses job.sceneCount ?? env.VIDEO_STITCH_SCENE_COUNT
    → isMultiActPipeline()
    → generateMultiActVideo()    workers/multi-act-pipeline.ts
        → renderCinematicVideoWithFallback() × N scenes  lib/video/dispatcher.ts
        → stitchVideos()         FFmpeg
    → uploadLocalFileToStorage() lib/storage/s3.ts
  → updateJob(complete)
```

### Free job creation (X profile → video)
```
POST /api/video/public-create
  → enforceRateLimit()
  → resolveMemecoinMetadata() OR normalizeXProfileInput()
  → createTokenVideoJob() OR createPromptVideoJob()
  → triggerJobProcessingSoft()

Same worker path but sceneCount is always 2 (two_act_cinema experience)
```

---

## Key Files and Their Responsibilities

| File | Responsibility |
|------|---------------|
| `lib/env.ts` | Single source of truth for ALL env vars. Zod schema + getEnv() |
| `lib/types/domain.ts` | Core TypeScript interfaces — JobDocument, VideoDocument, etc. |
| `lib/jobs/repository.ts` | All DB reads/writes for jobs. State machine. |
| `lib/video/dispatcher.ts` | Provider chain — tries providers in priority order |
| `lib/video/pipeline.ts` | Single-clip render path (generateCinematicScript → render) |
| `workers/multi-act-pipeline.ts` | Multi-act render path (N scenes → FFmpeg stitch) |
| `workers/process-job.ts` | Orchestrates the full job lifecycle |
| `lib/auth/privy-server.ts` | Server-side Privy token verification |
| `lib/memecoins/metadata.ts` | DexScreener API — resolves token image + metadata |
| `components/video/VideoStudioForm.tsx` | Unified form for all job creation input types |
| `app/api/video/create/route.ts` | Premium job creation API (Privy-auth) |
| `app/api/video/public-create/route.ts` | Free job creation API (rate-limited) |
| `prisma/schema.prisma` | Database schema — source of truth for all tables |

---

## Job Document Fields You Must Understand

```typescript
interface JobDocument {
  jobId: string;                // UUID
  experience?: CinemaExperience; // "two_act_cinema" | "mythx" | "funcinema" | ...
  sceneCount?: number | null;   // per-request act count (3-10), null = use env default
  subjectImage?: string | null; // DexScreener image URL — passed as imageUrl to video providers
  requestedPrompt?: string | null; // the AI-constructed prompt sent to script generator
  visibility?: "public" | "private"; // private = Privy-auth required to read
  pricingMode?: "public" | "private" | "legacy";
  status: JobStatus;           // pending | processing | complete | failed
  progress: JobProgress;       // granular stage within status
  audioEnabled?: boolean | null;
  creatorId?: string | null;   // Privy user ID for private jobs
}
```

---

## Environment Variable Rules

1. All vars go through `lib/env.ts` — add to the Zod schema AND to the `safeParse({...})` input object.
2. Optional vars MUST use `trimOptionalEnvValue(process.env.VAR_NAME)` — Railway sets empty strings `""` which fail Zod `.min(1)` if passed raw.
3. `...process.env` is spread at the top of the `safeParse` input — explicit entries below it override. This is intentional.
4. `NEXT_PUBLIC_*` vars are safe to expose in client bundles. Everything else is server-only.
5. Never `process.env.VAR` directly in application code — always use `getEnv().VAR_NAME`.

---

## Database Rules

- **Never edit existing migration files** in `prisma/migrations/`. Create a new migration.
- New optional columns: use `Int?`, `String?`, etc. — never add required columns without a default.
- After schema changes: create migration locally, commit the `.sql` file, deploy with `npx prisma migrate deploy`.
- The `JobDispatchOutbox` table is the job queue. Do not bypass it. Do not delete entries manually in production.
- `Job.wallet` is used as a routing key in some places — do not treat it as a real wallet address.

---

## Video Provider Rules

- `imageUrl` — always pass the DexScreener token image through as `imageUrl` to `renderCinematicVideoWithFallback()` and `generateMultiActVideo()`. This enables image-to-video for token jobs.
- Scene duration is determined by `env.VIDEO_MIN_DURATION_SECONDS` as a floor, `env.VIDEO_MAX_DURATION_SECONDS` as a ceiling.
- `sceneCount` is clamped to 3–10 in `resolveSceneCount()` regardless of what the job or env says.
- `two_act_cinema` experience always produces exactly 2 acts — it bypasses the sceneCount logic.
- Provider selection respects `VIDEO_PROVIDER_PRIORITY` env var (comma-separated list).

---

## Security Rules

- All mutation endpoints that affect private data require `requirePrivyAuth()`.
- Public endpoints require `enforceRateLimit()`.
- The `ADMIN_SECRET` header guards admin-only endpoints (job deletion, etc.).
- The `WORKER_TOKEN` header guards the `/api/worker/trigger` endpoint.
- CSRF is enforced in `lib/auth/privy-server.ts` via origin/referer checking.
- `secureCompare()` from `lib/security/crypto.ts` must be used for all token comparisons — never `===`.
- Rate limiter is in-memory for single-instance. Acceptable tradeoff — documented.

---

## Things That Will Break If You Touch Them Wrong

| Area | Risk | Why |
|------|------|-----|
| `lib/env.ts` — `...process.env` spread | Railway startup crash | Removing spread breaks Railway env injection |
| `lib/env.ts` — `trimOptionalEnvValue` | Bad env config error | Raw empty strings fail Zod min(1) |
| `prisma/migrations/` | Data loss | Editing existing migrations breaks migration history |
| `workers/process-job.ts` — `beginJobProcessing()` | Duplicate processing | Atomic WHERE clause prevents race conditions |
| `lib/auth/privy-server.ts` — origin check | CSRF vulnerability | Do not weaken or remove |
| `components/video/VideoStudioForm.tsx` — sceneCount | Wrong act count sent | Must only send when pipeline is hypermyths_generic_engine |

---

## Test Coverage Map

| Test file | Covers |
|-----------|--------|
| `tests/video-service.render-retry.test.ts` | dispatcher fallback, retry logic |
| `tests/jobs-route.test.ts` | job creation, status, cleanup |
| `tests/youtube-resolve.test.ts` | YouTube URL normalization |
| `tests/feed-*.test.ts` | SSE feed, job card embedding |
| `tests/security-*.test.ts` | rate limiter, crypto helpers |

---

## Commit Message Format

```
<verb> <what>: <detail>

- bullet for each file changed and why
- another bullet

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Verbs: `Add`, `Fix`, `Remove`, `Update`, `Refactor`, `Wire`, `Document`

---

## What Not to Build

The following have been deliberately removed and must not be re-added:

| Removed | Reason |
|---------|--------|
| Solana payment flows | Replaced by free + Privy-auth model |
| x402 micropayments | Same |
| Dedicated payment address generation | Same |
| Firebase / Firestore | Replaced by PostgreSQL |
| Firebase Storage | Replaced by Supabase S3 |
| Discount codes (UI) | Feature removed; schema kept for historical data |
| Admin cockpit UI | Removed — use Railway CLI / direct DB access |
| `PaymentInstructionsCard` in `/creator` and `/login` | Removed — kept in other components that still use it |

---

## Quick Reference

```bash
# Dev
npm run dev

# Test
npm test
npm test tests/video-service.render-retry.test.ts

# Validate env
npm run env:check

# Scan for leaked secrets
npm run secrets:scan

# DB migrations (dev)
npx prisma migrate dev --name describe_change

# DB migrations (prod)
npx prisma migrate deploy

# Check Railway logs
railway logs --service worker

# Verify provider chain locally
ALLOW_IN_PROCESS_WORKER=true npm run dev
```
