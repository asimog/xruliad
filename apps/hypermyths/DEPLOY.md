# HyperMyths Deployment Guide

If you can follow a recipe, you can deploy this app.

You will set up 4 platforms:
1. Supabase (database + S3 storage)
2. Privy (authentication for premium studio)
3. Railway (G0DM0D3 brain + workers + video service)
4. Vercel (frontend)

Keep this file open alongside `.env.local`. Fill `.env.local` as you go.
After each major step, run `npm run env:check`.

---

## Safety Rules (Read First)

1. Never share values for `WORKER_TOKEN`, `VIDEO_API_KEY`, `ADMIN_SECRET`, `XAI_API_KEY`, `GODMODE_API_KEY`, `OPENROUTER_API_KEY`, or database passwords.
2. Do steps in order. If you skip ahead, things break.
3. When a step says "copy", copy exactly.
4. If a value says `NEXT_PUBLIC_...`, that one is allowed to be public.

---

## Step 0: Accounts You Need

Create accounts first:
- https://supabase.com
- https://railway.app
- https://vercel.com
- https://console.x.ai
- https://developer.x.com

---

## Step 1: Supabase Setup (Do This First)

Everything depends on this step.

### 1A) Create project
1. Go to Supabase -> New project
2. Name: `hypermyths`
3. Pick a region near you
4. Set a strong database password
5. Wait until project is ready

### 1B) Fill `DATABASE_URL`
1. Supabase -> Settings -> Database
2. Find "Connection string"
3. Choose `URI`
4. Copy the "Transaction" URL (port `5432`)
5. Replace `[YOUR-PASSWORD]` with your real DB password
6. Paste into `.env.local` as `DATABASE_URL`

### 1C) Fill browser Supabase keys
1. Supabase -> Settings -> API
2. Copy Project URL -> set `NEXT_PUBLIC_SUPABASE_URL`
3. Copy anon/public key -> set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 1D) Setup Supabase Storage (S3)
1. Supabase -> Storage -> New bucket
2. Bucket name: `videos`
3. Turn on Public bucket
4. Create bucket
5. Supabase -> Settings -> Storage -> Enable S3 Access
6. Copy and fill in `.env.local`:
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Done check for Step 1:
- `DATABASE_URL` is not blank
- all 5 Supabase values are filled
- `npm run env:check` passes

---

## Step 2: xAI Video Key

1. Open https://console.x.ai
2. Create API key
3. Paste into `.env.local` as `XAI_API_KEY`

Done check:
- `XAI_API_KEY` is not blank
- `npm run env:check` still passes

---

## Step 2B: G0DM0D3 Brain + OpenRouter

1. Create an OpenRouter key at https://openrouter.ai/keys
2. Generate another random secret for `GODMODE_API_KEY`
3. Add these values to `.env.local`:
- `GODMODE_API_BASE_URL=http://godmode.railway.internal:7860/v1`
- `GODMODE_API_KEY=...`
- `GODMODE_MODEL=ultraplinian/fast`

Done check:
- `GODMODE_API_BASE_URL` is not blank
- `GODMODE_API_KEY` is not blank
- `GODMODE_MODEL` is not blank
- `npm run env:check` still passes

---

## Step 3: Privy Authentication Setup

The `/creator` premium studio and `POST /api/video/create` require Privy auth.

1. Go to [dashboard.privy.io](https://dashboard.privy.io) and create an account
2. Click **Create app** → name it `HyperMyths`
3. From the **App Settings** page:
   - Copy **App ID** → paste into `.env.local` as both `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_ID`
   - Copy **App Secret** → paste into `.env.local` as `PRIVY_APP_SECRET` (**never commit this**)
   - Under **Verification Keys** → copy the JWKS public key → `PRIVY_JWT_VERIFICATION_KEY`
4. Under **Login methods**, enable: Google, Twitter, Farcaster, Discord, Wallet
5. Under **Allowed Origins / Redirect URLs**, add:
   - `http://localhost:3000` (local dev)
   - Your Vercel URL (add after Step 8)

Done check:
- `NEXT_PUBLIC_PRIVY_APP_ID` is filled (starts with `cm...`)
- `PRIVY_APP_ID` is the same value
- `PRIVY_APP_SECRET` is filled
- `PRIVY_JWT_VERIFICATION_KEY` is filled
- `npm run env:check` still passes

---

## Step 5: X (Twitter) API

Needed for reading tweets and optional posting.

1. Open https://developer.x.com
2. Create Project and App
3. Open Keys and Tokens
4. Copy Bearer Token -> `X_API_BEARER_TOKEN`
5. If you want auto-posting, also fill:
- `X_API_CONSUMER_KEY`
- `X_API_CONSUMER_SECRET`
- `X_API_ACCESS_TOKEN`
- `X_API_ACCESS_TOKEN_SECRET`

Done check:
- `X_API_BEARER_TOKEN` is not blank
- `npm run env:check` still passes

---

## Step 6: Generate 3 Secret Tokens

Run this command 3 separate times:

```bash
openssl rand -hex 32
```

Use the 3 outputs like this:
1. first output -> `WORKER_TOKEN`
2. second output -> `VIDEO_API_KEY`
3. third output -> `ADMIN_SECRET`

Do not reuse one value for all three. They must be different.

### What this command means (simple)

Command: `openssl rand -hex 32`
- `openssl` = security tool
- `rand` = make random data
- `-hex` = output letters/numbers only (0-9, a-f)
- `32` = 32 random bytes (prints 64 characters)

Why this matters:
- These values are secret "passwords" used by services talking to each other.

Done check:
- all 3 variables are filled and different

---

## Step 7: Railway Deploy - G0DM0D3 first

### 5A) Create Railway project
1. Open Railway -> New Project -> Empty Project
2. Name it `hypermyths`

### 5B) Add G0DM0D3
1. New Service -> GitHub Repo -> use `https://github.com/elder-plinius/G0DM0D3`
2. Use the root `Dockerfile`
3. Open Variables tab
4. Set:
- `OPENROUTER_API_KEY`
- `OPENROUTER_FREE_MODEL=meta-llama/llama-3.3-70b-instruct:free`
- `OPENROUTER_MODEL=openai/gpt-4o-mini`
- `TEXT_INFERENCE_PROVIDER=openrouter`
- `ELIZA_VIDEO_API_KEY`
- `ELIZA_VIDEO_BASE_URL=https://www.elizacloud.ai`
- `ELIZA_VIDEO_MODEL=fal-ai/minimax/hailuo-02/standard/text-to-video`
- `ELIZA_VIDEO_RESOLUTION=768p`
- `ELIZA_VIDEO_SIZE=1280x768`
- `ELIZA_VIDEO_ASPECT_RATIO=5:3`
- `VIDEO_PROVIDER_PRIORITY=eliza,xai,openrouter,fal,replicate,huggingface`
- `GODMODE_API_KEY`
- `PORT=7860`
5. Deploy and wait for green status

Done check:
- godmode service is green in Railway

### 5C) Add video-service
1. New Service -> GitHub Repo -> choose this repo
2. Set Root Directory: `video-service`
3. Set Dockerfile Path: `video-service/Dockerfile`
4. Open Variables tab
5. Add all variables tagged `[RAILWAY]` from `.env.local`
6. Deploy and wait for green status

### 5D) Get video-service URL
1. Railway -> video-service -> Settings -> Networking
2. Generate Domain
3. Copy domain into `.env.local` as `VIDEO_SERVICE_BASE_URL`

Done check:
- video-service is green in Railway
- `VIDEO_SERVICE_BASE_URL` is filled

---

## Step 8: Railway Deploy - workers

1. In same Railway project, add another service from same repo
2. Set Root Directory: `workers`
3. Set Dockerfile Path: `workers/Dockerfile`
4. Add all `[RAILWAY]` variables from `.env.local`
5. Deploy
6. Generate a workers domain (you may need it later for debugging)

Done check:
- workers service is green in Railway

---

## Step 9: Run Prisma Database Migrations

Run this only after `DATABASE_URL` is set and points to Supabase.

Prisma reads from `.env` by default. If your values are in `.env.local`, run:

```bash
cp .env.local .env
```

Then run:

```bash
npx prisma migrate deploy
```

### What this command means (simple)

Command: `npx prisma migrate deploy`
- `npx` = run a package command without global install
- `prisma` = database tool used by this app
- `migrate` = apply database changes (tables/columns)
- `deploy` = run pending migrations safely in deployed environments

Why this matters:
- It creates all required tables in your Supabase database.
- Without this, app features that save/read data will fail.

Expected result:
- command finishes without errors
- output says migrations were applied (or no pending migrations)

If it fails:
1. Check `DATABASE_URL` is correct and has real password
2. Check Supabase project is running
3. Run command again

---

## Step 10: Vercel Deploy (Frontend)

### 8A) Import project
1. Open Vercel -> Add New Project
2. Import this GitHub repo
3. Framework: Next.js (auto)
4. Root directory: `/`
5. Deploy once

First deploy may fail before env vars are filled. That is normal.

### 8B) Add env vars in Vercel
Go to Vercel -> Project -> Settings -> Environment Variables.

At minimum add:

#### Database + App

- `DATABASE_URL` (Railway PostgreSQL external connection string)
- `APP_BASE_URL` (your Vercel URL — set final value after first deploy)

#### Privy Auth (required for `/creator` and `/login`)

- `NEXT_PUBLIC_PRIVY_APP_ID` (public — same value you set in Step 3)
- `PRIVY_APP_ID` (same value)
- `PRIVY_APP_SECRET` (from Privy dashboard — add as Vercel secret)
- `PRIVY_JWT_VERIFICATION_KEY` (JWKS key from Privy — add as Vercel secret)

#### Backend services

- `GODMODE_API_BASE_URL`
- `GODMODE_API_KEY`
- `GODMODE_MODEL`
- `XAI_API_KEY`
- `XAI_BASE_URL`
- `XAI_VIDEO_MODEL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_FREE_MODEL`
- `TEXT_INFERENCE_PROVIDER`
- `ELIZA_VIDEO_API_KEY`
- `ELIZA_VIDEO_MODEL`
- `ELIZA_VIDEO_RESOLUTION`
- `ELIZA_VIDEO_SIZE`
- `ELIZA_VIDEO_ASPECT_RATIO`
- `VIDEO_PROVIDER_PRIORITY`
- `WORKER_TOKEN`
- `VIDEO_SERVICE_BASE_URL`

#### Storage (Supabase S3)

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`

#### Optional

- `X_API_BEARER_TOKEN`
- `COCKPIT_USERNAME`
- `COCKPIT_PASSWORD`
- `ADMIN_SECRET`
- `TRUST_PROXY_IP_HEADERS` (`true` on trusted proxy infrastructure)
- `AUTONOMOUS_CHAT_TOKEN` (recommended for `/api/autonomous/chat`)

### 8C) Redeploy
1. Open Deployments
2. Redeploy latest deployment

### 8D) Set final APP_BASE_URL
1. Copy your live Vercel URL (example: `https://hypermyths.vercel.app`)
2. Update `APP_BASE_URL` in:
- Vercel env vars
- Railway godmode vars if you want it for logging/metadata
- Railway workers vars
- Railway video-service vars
3. Redeploy Vercel and Railway services

Done check:
- Vercel deployment is green
- site opens in browser

---

## Step 11: Music Experience Setup (`/music`)

This project now includes an immersive local-first music route:

- `/music` uses one client-side audio engine and one WebGL loop
- supports local file upload + drag/drop
- supports playlist files from `public/music`
- supports playlist tracks from full public URLs (including S3 public objects)
- supports simulation library loading from JSON

### 9A) Add your playlist MP3 files

1. Put your MP3 files in:
   - `public/music/`
2. Create:
   - `public/music/playlist.json`
3. Format:

```json
{
  "tracks": [
    { "file": "track-01.mp3", "title": "Track 01" },
    { "file": "track-02.mp3", "title": "Track 02" },
    {
      "url": "https://your-project-ref.supabase.co/storage/v1/object/public/music/track-03.mp3",
      "title": "Track 03 (S3)"
    }
  ]
}
```

Notes:
- Files are served statically by Next.js.
- If `NEXT_PUBLIC_MUSIC_PLAYLIST_BASE_URL` is set, `file` entries are resolved relative to that base (good for S3/CDN buckets).
- If `playlist.json` is missing, `/music` falls back to built-in demo tracks.

### 9B) Add external simulation presets (optional)

1. Create:
   - `public/music/simulations.json`
2. Format:

```json
{
  "simulations": [
    {
      "id": "custom-hyper-bloom",
      "name": "Custom Hyper Bloom",
      "physics": "Radial wave bloom with damped orbit feedback.",
      "description": "External simulation profile loaded from JSON.",
      "seedTag": "custom-hyper-bloom"
    }
  ]
}
```

Notes:
- External entries are merged with built-ins (built-ins now include 42 presets).
- Duplicate IDs are ignored after first match.

### 9C) Runtime behavior

- `/music` skips the global splash gate and initializes immediately.
- Browser audio policy still requires a user gesture to start sound (press Play once).
- Each track maps to a deterministic visual seed.
- **Random Scene** button changes both profile + simulation.
- Matrix overlay remains optional and runs as a separate overlay loop.

---

## Step 12: Smoke Test (Final Test)

1. Open your live Vercel URL
2. Go to Chat
3. Enter a Twitter handle (example: `@elonmusk`)
4. Submit job
5. Watch status move: `pending -> processing -> complete`
6. Confirm video appears in feed

---

## Where Each Variable Goes

- Vercel: frontend app env vars
- Railway workers: background job env vars
- Railway video-service: rendering env vars

Quick rule:
- `[VERCEL]` -> Vercel only
- `[RAILWAY]` -> both Railway services
- `[ALL]` -> Vercel + both Railway services

---

## Very Common Mistakes

1. `DATABASE_URL` still has `[YOUR-PASSWORD]` text
2. forgot to run `npx prisma migrate deploy`
3. used same secret for all 3 secret variables
4. forgot to copy `VIDEO_SERVICE_BASE_URL` from Railway generated domain
5. changed env vars but forgot to redeploy

---

## You Are Done When

1. All required `.env.local` values are filled
2. `npm run env:check` passes
3. Video-service is green on Railway
4. Workers are green on Railway
5. Prisma migration command succeeds
6. Vercel deployment is green
7. `/login` shows the Privy sign-in UI
8. Signing in redirects to `/creator`
9. A job submitted from `/creator` creates a video successfully
10. A free job submitted from `/media` also completes
