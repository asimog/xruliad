# Video Pipeline Implementation Plan

## Goal

Reshape HyperMyths into a three-mode video system:

- `MythX`: X biography videos built from profile metadata and tweets
- `Memecoin`: token videos built from DexScreener metadata
- `Random`: fully director-led 30-second videos

## Architecture

- `G0DM0D3` on Railway is the only text and orchestration brain
- `OpenRouter` provides the upstream model access for G0DM0D3
- `xAI` is used only for video clip generation
- `video-service` handles chunking, polling, stitching, thumbnailing, and upload
- `Remotion` is used only for the final stitching/composition layer
- The app worker owns job progression, asset persistence, and user-facing status

## End-to-End Pipeline

1. User submits MythX, memecoin, or random request
2. API creates a job and dispatches it to the worker
3. Worker gathers mode-specific source material
4. G0DM0D3 generates the report summary, directorial hook, and scene plan
5. App sends normalized render request to `video-service`
6. `video-service` asks xAI for per-chunk clips
7. `video-service` stitches clips with `Remotion`, extracts thumbnail, uploads assets
8. Worker stores final public URLs and marks the job complete
9. User watches the final stitched video on `/job/{jobId}` or `/api/video/{jobId}`

## Product Rules

- No wallet-address analysis engine in the active video path
- Token videos are memecoin-only and use DexScreener metadata
- MythX is biography-first, centered on the X profile and timeline voice
- Random always targets a 30-second cinematic short with broad creative freedom
- Final stitched video must be persisted at a stable URL and available to the user

## Implementation Order

1. Fix runtime and env validation issues
2. Simplify public generation routes to MythX, memecoin, and random
3. Remove wallet-analysis execution from the worker path
4. Make MythX scene planning biography-first
5. Improve DexScreener-derived memecoin metadata briefing
6. Persist render requests in `video-service` so stitched renders can recover and complete
7. Verify the final public video delivery endpoints locally
