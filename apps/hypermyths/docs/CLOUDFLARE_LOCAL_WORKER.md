# Cloudflare Tunnel + Local Worker

This deployment mode keeps the public app on Vercel, stores state in Supabase,
and runs the video stitching worker on your own machine behind Cloudflare
Tunnel. Railway remains the hot fallback.

## Architecture

- `Vercel` handles the public app and API routes.
- `Supabase Postgres` remains the source of truth for jobs and reports.
- `Supabase S3` stores final videos and thumbnails.
- `Local worker` runs `workers/server.ts` and performs job orchestration plus
  FFmpeg stitching on your computer.
- `Cloudflare Tunnel` exposes the worker endpoint securely at
  `https://worker.hypermyths.com/jobs/process`.
- `Railway worker` stays deployed and can be restored by changing `WORKER_URL`.

## Required Env Shape

### Vercel

```env
ALLOW_IN_PROCESS_WORKER=false
WORKER_BACKEND=cloudflare
WORKER_URL=https://worker.hypermyths.com/jobs/process
WORKER_TOKEN=replace-with-shared-secret
```

### Local worker machine

```env
NODE_ENV=production
APP_BASE_URL=https://hypermyths.com
DATABASE_URL=postgresql://...
WORKER_BACKEND=cloudflare
WORKER_TOKEN=replace-with-shared-secret
VIDEO_API_KEY=replace-with-shared-secret
VIDEO_API_BASE_URL=https://hypermyths.com/api
VIDEO_PROVIDER_PRIORITY=eliza,openrouter,huggingface,fal,replicate,xai
ELIZA_VIDEO_API_KEY=replace-with-eliza-video-key
ELIZA_VIDEO_MODEL=fal-ai/minimax/hailuo-02/standard/text-to-video
ELIZA_VIDEO_RESOLUTION=768p
ELIZA_VIDEO_SIZE=1280x768
ELIZA_VIDEO_ASPECT_RATIO=5:3
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=videos
S3_REGION=us-east-1
```

The local worker must be pointed at the same production database and storage
used by Vercel. Cloudflare Tunnel only exposes the worker HTTP server; it does
not replace Postgres, Prisma, or the storage layer.

## Tunnel Setup

1. Install `cloudflared` on the worker machine.
2. Authenticate once:

```bash
cloudflared tunnel login
```

3. Create the tunnel:

```bash
cloudflared tunnel create hypermyths-worker
```

4. Copy [cloudflared/worker-tunnel.example.yml](/mnt/d/mythos/hypermyths/cloudflared/worker-tunnel.example.yml)
   to your machine-specific Cloudflare config path and replace the credentials
   file path if needed.

5. Route DNS:

```bash
cloudflared tunnel route dns hypermyths-worker worker.hypermyths.com
```

6. Run the tunnel:

```bash
cloudflared tunnel run hypermyths-worker
```

## Worker Startup

Start the HTTP worker that Vercel will call:

```bash
npm run worker:start
```

Optional safety-net poller on the same machine:

```bash
npm run worker:start:poll
```

The poller is useful as a backup path if a remote trigger is missed, but the
primary production flow should still be Vercel -> Cloudflare Tunnel ->
`workers/server.ts`.

## Production Cutover

1. Confirm Railway worker is still healthy before switching.
2. Start the local worker and verify `http://localhost:8080/healthz`.
3. Start Cloudflare Tunnel and verify `https://worker.hypermyths.com/healthz`.
4. Update Vercel env:
   - `WORKER_BACKEND=cloudflare`
   - `WORKER_URL=https://worker.hypermyths.com/jobs/process`
5. Redeploy Vercel.
6. Submit one production job and watch:
   - Vercel logs for trigger success
   - local worker logs for `worker_process_job_*`
   - final video upload to Supabase storage

## Rollback

Rollback is only an env flip on Vercel:

```env
WORKER_BACKEND=railway
WORKER_URL=https://your-worker.railway.app/jobs/process
```

Keep the same `WORKER_TOKEN` on both worker backends so the rollback does not
require code or secret rotation during an incident.

## Operational Notes

- Do not let the worker machine sleep.
- Use a process supervisor such as `systemd`, PM2, or Docker restart policies.
- Keep `WORKER_ALLOW_UNAUTHENTICATED=false`.
- If the local worker is unavailable, job dispatch will fail fast and Railway
  can be restored by env change.
- For long-term stability, consider running the worker on a dedicated desktop,
  mini PC, or VPS instead of a daily-use laptop.
