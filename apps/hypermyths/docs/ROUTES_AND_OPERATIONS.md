# Routes and Operations

## Frontend Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | None | Landing page |
| `/media` | None | Free-tier creator — rate-limited, 2-act engine only |
| `/creator` | Privy (required) | Premium studio — 3–10 act engine, DexScreener image-to-video |
| `/login` | None | Privy sign-in; auto-redirects to `/creator` if already authenticated |
| `/feed` | None | Live SSE-backed job feed with embedded video players |
| `/job/[jobId]` | None | Job detail view — progress, report summary, inline video playback |
| `/music` | None | MythX audio engine playground |

---

## Video Creation APIs

### `POST /api/video/public-create`

Free tier. No authentication required. Enforces per-IP rate limiting.

**Request body:**

```json
{
  "requestKind": "token_video" | "generic_cinema" | "mythx",
  "requestedPrompt": "string (for generic_cinema)",
  "contractAddress": "string (for token_video)",
  "twitterHandle": "string (for mythx)"
}
```

**Behavior:**

- Rate-limited: enforces IP-based limits via `enforceRateLimit()`
- Always uses the 2-act engine — `sceneCount` is not accepted
- For `token_video`: resolves token metadata from DexScreener; the token image becomes `imageUrl` for image-to-video rendering
- Writes `Job` + `JobDispatchOutbox` row; worker processes asynchronously
- Sets `sceneCount: null` on the job

**Key code:** `app/api/video/public-create/route.ts`

---

### `POST /api/video/create`

Premium tier. Requires Privy authentication.

**Headers:**

```
Authorization: Bearer <privy_access_token>
```

**Request body:**

```json
{
  "requestKind": "token_video" | "generic_cinema" | "mythx",
  "pipeline": "hypermyths_generic_engine" | "mythx_engine",
  "requestedPrompt": "string (for generic_cinema)",
  "contractAddress": "string (for token_video)",
  "twitterHandle": "string (for mythx)",
  "sceneCount": 3
}
```

**`sceneCount` behavior:**

- Range: 3–10 (validated by Zod; values outside range are rejected)
- Only applied when `pipeline === "hypermyths_generic_engine"` — ignored otherwise
- Stored on the `Job` record; `resolveSceneCount()` in the worker reads `job.sceneCount ?? VIDEO_STITCH_SCENE_COUNT`
- Defaults to 3 if omitted

**Token image-to-video:**

For `token_video` jobs, the DexScreener token image is resolved and passed as `imageUrl` through the entire render chain (`multi-act-pipeline.ts` → `pipeline.ts` → `dispatcher.ts` → video provider).

**Key code:** `app/api/video/create/route.ts`

---

## Job Management APIs

### `GET /api/jobs/[jobId]`

Returns the combined job payload:

```json
{
  "job": { ... },
  "report": { ... },
  "video": { ... },
  "status": "pending | processing | complete | failed",
  "progress": 0.0–1.0
}
```

Operational details:
- Retries on transient DB pool exhaustion
- Returns degraded `200` instead of hard-failing during saturation
- Attempts recovery when job is complete but finalized video record is missing

---

### `POST /api/jobs/[jobId]/retry`

Retries failed jobs only. Returns `409` for safe no-op cases (already processing, non-retryable failure).

---

### `POST /api/jobs/[jobId]/trigger`

Manual trigger for debugging stuck jobs.

---

### `DELETE /api/jobs?status=failed&limit=N`

Admin-only cleanup.

Safety contract:
- Requires `Authorization: Bearer <ADMIN_SECRET>`
- Refuses every status except `failed`
- Deletes at most `N` failed jobs per call
- Cleans up linked outbox, video-render, and publication rows first

---

## Video Playback API

### `GET /api/video/[jobId]`

Unified playback/download proxy.

Behavior:
- Returns status JSON while render is not ready
- Streams from Railway persistent disk when available
- Otherwise redirects to a signed S3 URL or the stored remote URL
- Supports `?download=true`

---

## Report API

### `GET /api/report/[jobId]`

Returns the generated cinematic report or `404`.

---

## Worker Dispatch API

### `POST /api/worker/trigger`

Internal route used by the Railway worker service to claim and process jobs from the `JobDispatchOutbox` table.

**Headers:**

```
Authorization: Bearer <WORKER_TOKEN>
```

Uses constant-time comparison (`secureCompare`) to validate the token. Returns `401` on mismatch, `200` with job result on success.

**Key code:** `app/api/worker/trigger/route.ts`

---

## Live Feed

### `GET /api/autonomous/feed`

SSE endpoint for the live feed page.

Payload per event includes job state, prompt metadata, and video readiness metadata. The feed UI renders a `<video>` player only when `status === "complete"` and `video.renderStatus === "ready"`.

---

## Testing Targets

Keep these green when touching the listed areas:

| Test file | Covers |
|-----------|--------|
| `tests/video-service.render-retry.test.ts` | Scene render retry, fallback chain |
| `tests/video-service.contract.test.ts` | Video service API contract |
| `tests/jobs.route-resilience.test.ts` | Job API resilience under DB saturation |
| `tests/jobs.retry-route.test.ts` | Retry endpoint edge cases |
| `tests/jobs.delete-route.test.ts` | Admin delete safety contract |
| `tests/feed.route.test.ts` | SSE feed payload shape |
| `tests/jobs.recovery.test.ts` | Job recovery (complete but missing video) |

---

## Key Source Locations

| Area | File |
|------|------|
| Free video creation | `app/api/video/public-create/route.ts` |
| Premium video creation | `app/api/video/create/route.ts` |
| Worker trigger | `app/api/worker/trigger/route.ts` |
| Job CRUD | `app/api/jobs/[jobId]/route.ts` |
| Live feed SSE | `app/api/autonomous/feed/route.ts` |
| Video playback proxy | `app/api/video/[jobId]/route.ts` |
| Job state machine | `lib/jobs/repository.ts`, `lib/jobs/retry.ts` |
| Video provider chain | `lib/video/dispatcher.ts` |
| Multi-act pipeline | `workers/multi-act-pipeline.ts` |
| Privy server auth | `lib/auth/privy-server.ts` |
| Rate limiting | `lib/security/rate-limit.ts` |
