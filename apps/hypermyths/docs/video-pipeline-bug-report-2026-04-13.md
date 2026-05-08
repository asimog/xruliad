# Video Pipeline Bug Report

Date: 2026-04-13

## Summary

The current production video pipeline has two separate failure modes:

1. Jobs are being marked as `processing` in the database, but prompt jobs often never persist a `report` or `video` row.
2. The newer three-act stitcher can produce a stitched local file, but then attempts to upload that local path through a helper that expects a remote URL.

The immediate result is that `/feed` shows jobs stuck in progress, `/job/[jobId]` has no playable asset, and `/api/video/[jobId]` can return `404` because no `video` record was created.

## Live Evidence

- The most recent production feed job inspected was `4ee583f1-c5ac-4f48-a259-cd637ec483b4`.
- `GET /api/jobs/4ee583f1-c5ac-4f48-a259-cd637ec483b4` returned:
  - `status: processing`
  - `progress: generating_report`
  - `report: null`
  - `video: null`
- `GET /api/video/4ee583f1-c5ac-4f48-a259-cd637ec483b4` returned `404`.
- Two additional recent jobs showed the same pattern:
  - `58f34d43-85ae-4b38-943a-3fda0bc8ec3d`
  - `728d8767-bf47-472a-bbe9-9f7f342be327`

## Root Causes

### 1. Worker dispatch can strand jobs in `processing`

Files:

- `lib/jobs/trigger.ts`
- `app/api/generate/auto/route.ts`
- `lib/jobs/repository.ts`

Problem:

- `triggerJobProcessing()` falls back to `void processJob(jobId)` when `WORKER_URL` is not configured.
- `beginJobProcessing()` flips the job from `pending` to `processing`.
- If the request lifecycle ends before the background work completes, the job remains in `processing` with no finished artifacts.

Observed impact:

- Jobs become visible in `/feed`.
- They never create `report` or `video` rows.
- The website has nothing to display.

### 2. The three-act stitcher passes a local file path into a remote-URL uploader

Files:

- `workers/three-act-pipeline.ts`
- `lib/storage/s3.ts`

Problem:

- `generateThreeActVideo()` stitches three xAI clips into `combined.mp4` in a temporary local directory.
- It then calls `uploadVideoToStorage(outputPath, storagePath)`.
- `uploadVideoToStorage()` expects `sourceUrl` to be fetchable over HTTP(S), not a local filesystem path.
- On failure it returns the original `sourceUrl`, which in this case is the temporary local path.
- The temp directory is then deleted.

Observed impact:

- Even if stitching succeeds, the returned `videoUrl` can be a dead local path that the website cannot fetch or display.

### 3. The website currently exposes missing assets awkwardly

Files:

- `app/job/[jobId]/page.tsx`
- `app/api/video/[jobId]/route.ts`

Problem:

- The job page still renders an "Open Video" link by falling back to `/api/video/[jobId]`.
- If the `Video` row does not exist yet, that endpoint returns `404`.

Observed impact:

- Users get a dead video link instead of a clearer "not ready yet" state.

## Decision

Do not continue with multi-clip stitching until a single prompt -> single xAI video -> persisted asset -> displayed on `/job/[jobId]` works reliably end to end.

## Immediate Next Step

Build a phase-1 pipeline that:

1. Accepts a simple prompt.
2. Generates one 8-second xAI video.
3. Uploads that single generated clip to persistent storage.
4. Writes the `Video` row.
5. Displays the asset on the website.
