# HyperMyths — Backend Architecture

## Overview

HyperMyths is a free AI video generation platform. Users input an X (Twitter) profile handle, a Solana/EVM token contract address, or a creative prompt, and receive a short AI-rendered cinematic film.

**Platform split:**
- **Vercel** — Next.js 16 frontend + API routes + Privy-authenticated premium studio
- **Railway** — Docker worker service (job execution), video service (FFmpeg stitching), G0DM0D3 (text orchestration)
- **Supabase** — PostgreSQL database + S3-compatible video storage

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  VERCEL — Next.js 16 (App Router)                   │
│                                                     │
│  Public:  /  /media  /feed  /music  /job/[jobId]   │
│  Auth:    /login  /creator  (Privy)                 │
│  API:     /api/video/create      (Privy-auth)       │
│           /api/video/public-create (rate-limited)   │
│           /api/jobs/[jobId]                         │
│           /api/worker/trigger    (WORKER_TOKEN)     │
│           /api/autonomous/feed   (SSE)              │
└──────────┬──────────────────────────────────────────┘
           │ HTTPS + WORKER_TOKEN
           ▼
┌──────────────────────────────────────────────────────┐
│  RAILWAY — Docker Services                           │
│                                                      │
│  worker (:8080)          video-service (:8090)       │
│  ├── process-job.ts      ├── FFmpeg                  │
│  ├── mythx-engine.ts     └── render pipeline         │
│  ├── x-bot.ts                                       │
│  └── telegram-bot.ts     godmode (:7860)             │
│                          G0DM0D3 text orchestrator   │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  SUPABASE                                            │
│  PostgreSQL (DATABASE_URL)                           │
│  S3 object storage (video files, thumbnails)        │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  EXTERNAL AI PROVIDERS                               │
│  OpenRouter → SeedancePro (primary video)            │
│  xAI → grok-imagine-video (fallback)                 │
│  Fal → HuggingFace Wan2.1 (fallback)                │
│  Replicate (fallback)                                │
│  HuggingFace direct (fallback)                      │
│  G0DM0D3 / OpenRouter → text/script generation      │
│  DexScreener → token metadata + images              │
│  X API → tweet scraping for MythX                  │
└──────────────────────────────────────────────────────┘
```

---

## User Tiers

| Tier | Entry Point | Auth | Acts |
|------|------------|------|------|
| Free | `/media` + `POST /api/video/public-create` | None (IP rate-limited) | 2 |
| Premium | `/creator` + `POST /api/video/create` | Privy | 3–10 |

---

## Job Lifecycle

```
[User submits input]
      │
      ▼
POST /api/video/create  OR  /api/video/public-create
      │  requirePrivyAuth() OR enforceRateLimit()
      │  resolveMemecoinMetadata() — DexScreener (for contract_address)
      │  normalizeXProfileInput() — (for x_profile)
      │
      │  createTokenVideoJob() OR createPromptVideoJob()
      │    → Job row (status: pending)
      │    → JobDispatchOutbox row
      │
      ▼
triggerJobProcessingSoft() — queues async dispatch
      │
      ▼
Worker polls JobDispatchOutbox (every ~2 seconds)
      │  Claims row atomically via updateMany WHERE
      │  Calls processJob(jobId)
      │
      ▼
processJob() — workers/process-job.ts
      │
      ├── processTokenVideoJob()    ← contract_address input
      │     resolveMemecoinMetadata() ← DexScreener API
      │     buildTokenVideoArtifacts() ← story/report
      │     token.image → imageUrl for video providers
      │
      ├── processPromptVideoJob()   ← prompt OR x_profile
      │     generateReportSummary()
      │     job.subjectImage → imageUrl (if set)
      │
      └── [both paths merge here]
            resolveSceneCount()    ← job.sceneCount ?? env default
            isMultiActPipeline()
            │
            ├── multi-act → generateMultiActVideo()
            │     generateCinematicScript() ← LLM
            │     normalizeScenes()
            │     renderCinematicVideoWithFallback() × N scenes
            │     stitchVideos() ← FFmpeg concat + crossfade
            │     uploadLocalFileToStorage() ← S3
            │
            └── single-clip → buildAndRenderVideo()
                  generateCinematicScript() ← LLM
                  renderCinematicVideoWithFallback()
                  upload to S3
      │
      ▼
updateJob(complete) + upsertVideo()
User reads: GET /api/jobs/[jobId]
```

### Job Status

```
pending → processing → complete
                    ↘ failed
```

### Job Progress (granular stages within "processing")

```
pending → generating_report → generating_script → generating_video
       → rendering_scenes → rendering_scene_1..N
       → stitching_video → uploading_assets → complete
                                           ↘ failed
```

---

## Database Schema (Key Tables)

### Job
| Column | Type | Description |
|--------|------|-------------|
| `jobId` | String PK | UUID |
| `status` | String | pending / processing / complete / failed |
| `progress` | String | Granular stage |
| `experience` | String? | Cinema experience type |
| `sceneCount` | Int? | Per-request act count (3–10); null = use env default |
| `subjectImage` | String? | DexScreener token image URL |
| `requestedPrompt` | String? | AI-constructed prompt sent to script generator |
| `visibility` | String? | public / private |
| `creatorId` | String? | Privy userId (private jobs) |
| `requestKind` | String? | token_video / generic_cinema / mythx / etc. |
| `audioEnabled` | Boolean? | Include audio track |
| `subjectName` | String? | Token name, X handle, etc. |
| `subjectAddress` | String? | Token contract address |
| `subjectChain` | String? | solana / ethereum / bsc / base |

### JobDispatchOutbox
| Column | Type | Description |
|--------|------|-------------|
| `jobId` | String FK | References Job |
| `status` | String | pending / dispatched / failed |
| `attempts` | Int | Retry count |
| `nextAttemptAt` | DateTime | When to next attempt |
| `lockUntil` | DateTime? | Optimistic lock expiry (prevents parallel processing) |

### VideoRender
| Column | Type | Description |
|--------|------|-------------|
| `jobId` | String FK | References Job |
| `videoUrl` | String? | S3 public URL |
| `renderStatus` | String | queued / processing / ready / failed |
| `duration` | Int? | Video length in seconds |

---

## Video Provider Chain

`lib/video/dispatcher.ts` — `renderCinematicVideoWithFallback(params)`

```
Try providers in priority order (VIDEO_PROVIDER_PRIORITY env var):
  1. openrouter  → SeedancePro via OpenRouter API
  2. xai         → grok-imagine-video
  3. fal         → HuggingFace Wan2.1 via fal-ai inference
  4. replicate   → configurable model
  5. huggingface → direct inference API

All receive: { prompt, durationSeconds, imageUrl?, resolution?, aspectRatio? }
If all fail → throws Error("All video providers failed")
```

`imageUrl` is the DexScreener token image for contract jobs. Providers that support image conditioning use it for image-to-video generation.

Provider env vars:
- `OPENROUTER_API_KEY` — primary
- `XAI_API_KEY` — fallback
- `FAL_API_KEY` — fallback
- `REPLICATE_API_KEY` — fallback
- `HUGGINGFACE_API_KEY` — fallback

---

## Multi-Act Engine

`workers/multi-act-pipeline.ts` — `generateMultiActVideo(input)`

```
Input: { prompt, jobId, sceneCount: 3-10, imageUrl? }
│
├── generateCinematicScript() → { hookLine, scenes: [{visualPrompt, narration, durationSeconds}] }
├── normalizeScenes() → validate, fill gaps up to sceneCount
├── For each scene:
│     renderCinematicVideoWithFallback({ prompt: scene.visualPrompt, imageUrl })
│     downloadVideo(url) → scene-N.mp4 in temp dir
├── stitchVideos(files) → FFmpeg concat filter + 0.5s crossfade transitions at 24fps
├── uploadLocalFileToStorage(combined.mp4) → S3
└── cleanup temp directory

Output: { videoUrl, scenes[], hookLine, totalDuration }
```

Scene count clamping: `Math.max(3, Math.min(10, requestedCount))`

Source priority for scene count: `job.sceneCount` → `env.VIDEO_STITCH_SCENE_COUNT` (default: 3)

---

## Text / Script Generation

`lib/ai/cinematic.ts` — `generateCinematicScript(walletStory)`

Provider chain: G0DM0D3 (Railway) → OpenRouter → HuggingFace direct

Output JSON schema:
```json
{
  "hookLine": "string",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualPrompt": "string — no text in frame, cinematic description",
      "narration": "string — voiceover text",
      "durationSeconds": 5
    }
  ]
}
```

Visual prompt constraints (enforced in system prompt):
- No readable text, logos, or UI elements in frame
- Cinematic camera movement language
- No invented financial claims for token subjects

---

## Storage

`lib/storage/s3.ts` — AWS SDK v3 against Supabase S3-compatible endpoint

| Operation | Function |
|-----------|----------|
| Upload rendered video | `uploadLocalFileToStorage(jobId, filePath)` |
| Generate signed URL | `generateSignedVideoUrl(jobId, expirySec)` |
| Stream to client | `getVideoStream(jobId)` |

S3 path convention: `video-renders/{jobId}/final.mp4`

Required env: `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`

---

## Worker Server

`workers/server.ts` — HTTP on Railway port 8080

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/dispatch` | POST | WORKER_TOKEN | Claim + process one outbox job |
| `/health` | GET | None | Health check |
| `/moltbook/sync` | POST | WORKER_TOKEN | MoltBook publication sync |
| `/moltbook/retry` | POST | WORKER_TOKEN | MoltBook retry |

The worker polls `JobDispatchOutbox` continuously with a short sleep between polls. Each poll uses `updateMany` with a WHERE clause to atomically claim one row — prevents parallel processing of the same job.

---

## Authentication

### Public routes
`enforceRateLimit()` from `lib/security/rate-limit.ts`. Rules defined per-route:
- Video creation: 5/min, 20/hour per IP
- Chat: 20/min, 300/hour per IP
- Retry: 3/min, 10/hour per job key

### Premium routes (Privy)
`requirePrivyAuth(request)` from `lib/auth/privy-server.ts`:
1. Extract Bearer token from `Authorization` header
2. Validate origin/referer (CSRF protection)
3. Verify with `PrivyClient.verifyAuthToken()` using `PRIVY_JWT_VERIFICATION_KEY`
4. Returns `{ ok: true, session: PrivySession }` or `NextResponse(401)`

### Worker/admin
- `WORKER_TOKEN` — `secureCompare()` constant-time comparison
- `ADMIN_SECRET` — header-based for admin endpoints

---

## Bots

### Telegram (`workers/telegram-bot.ts`)
Commands: `/start`, `/mythx @handle`, `/random`, `/status`
Creates jobs via `createPromptVideoJob()` + `triggerJobProcessingSoft()`

### X Bot (`workers/x-bot.ts`)
Polls X API for `@HyperMythsX` mentions. Creates MythX biography jobs.
Required: `X_API_BEARER_TOKEN`

---

## Key Design Decisions

**PostgreSQL outbox pattern** — `JobDispatchOutbox` provides reliable exactly-once delivery without a message queue. Atomic claim via `updateMany WHERE status=pending AND (lockUntil IS NULL OR lockUntil < now())`.

**In-process worker** — `ALLOW_IN_PROCESS_WORKER=true` runs job processing in the Next.js API route itself. Useful for local dev without Railway.

**Provider fallback chain** — configurable via `VIDEO_PROVIDER_PRIORITY`. System tries each provider in sequence, only fails if all providers fail.

**Image-to-video** — DexScreener token images flow through as `imageUrl` at every level of the video pipeline (dispatcher → each scene in multi-act engine). No extra configuration needed.

**Privy + free tier coexistence** — `VideoStudioForm` serves both tiers. `requiresPrivyAuth` and `allowedPipelines` props control what each page shows. The same API routes handle both, differentiated by auth.
