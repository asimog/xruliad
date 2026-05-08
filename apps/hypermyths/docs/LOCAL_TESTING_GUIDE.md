# HyperMyths — Local Testing & Operator Guide

Complete step-by-step instructions for setting up, testing, and running HyperMyths locally on Windows.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 22+** installed ([nodejs.org](https://nodejs.org/))
- [ ] **Git** installed ([git-scm.com](https://git-scm.com/))
- [ ] **Supabase account** ([supabase.com](https://supabase.com)) — free tier works
- [ ] **OpenRouter API key** ([openrouter.ai](https://openrouter.ai)) — free tier works
- [ ] **xAI API key** ([console.x.ai](https://console.x.ai)) — required for video generation

**Optional (for full feature testing):**
- [ ] **X (Twitter) API Bearer Token** ([developer.x.com](https://developer.x.com)) — for MythX biography videos
- [ ] **PostgreSQL client** (optional — for direct DB inspection)

---

## Step 1: Clone the Repository

```powershell
# Open PowerShell in your projects folder
cd d:\mythOS

# Clone the repository
git clone https://github.com/asimog/HyperMyths.git
cd HyperMyths
```

**Verify:**
```powershell
git log --oneline -5
# Should show recent commits including security fixes
```

---

## Step 2: Install Dependencies

```powershell
# Install all npm packages
npm install

# Verify installation completed successfully
npm list --depth=0
# Should show:
# ├── next@16.x.x
# ├── react@19.x.x
# ├── @prisma/client@7.x.x
# ├── xai-sdk@1.x.x
# └── zod@4.x.x
```

**Expected output:** No errors. If you see peer dependency warnings, they're safe to ignore.

**Time:** ~2-3 minutes depending on internet speed.

---

## Step 3: Create Supabase Project

### 3.1 Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Organization:** Select your org (or create one)
   - **Project name:** `hypermyths-dev`
   - **Database password:** Click **"Generate a password"** — **SAVE THIS**
   - **Region:** Choose closest to you (e.g., `US East (N. Virginia)`)
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

### 3.2 Get Database Connection String

1. In your Supabase project dashboard, click **"Project Settings"** (gear icon, bottom-left)
2. Click **"Database"** in the left sidebar
3. Scroll to **"Connection string"** section
4. Select **"URI"** tab (not "Connection parameters")
5. Under **"Connection pooler"**, select **"Session"** mode (port `5432`)
6. Copy the entire string. It looks like:
   ```
   postgresql://postgres.abc123xyz:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

**⚠️ IMPORTANT:** For serverless runtime (Vercel), prefer **Transaction mode (6543)** with `?pgbouncer=true&connection_limit=1` to avoid pool exhaustion.  
Use **Session mode (5432)** only for workflows that require direct long-lived DB sessions (for example certain migration/debug tasks).

### 3.3 Create Storage Bucket

1. Click **"Storage"** in the left sidebar (bucket icon)
2. Click **"New bucket"**
3. Fill in:
   - **Name:** `videos` (exactly this, lowercase)
   - **Public:** Toggle **ON** ✅
   - **File size limit:** Leave blank (unlimited)
   - **Allowed MIME types:** Leave blank (all types)
4. Click **"Create bucket"**

### 3.4 Get S3 Credentials

1. Click **"Project Settings"** (gear icon)
2. Click **"Storage"** in the left sidebar
3. Scroll to **"S3 API"** section
4. If S3 API is not enabled, click **"Enable S3 API"**
5. Copy these three values:
   - **S3 Endpoint:** `https://abc123xyz.supabase.co/storage/v1/s3`
   - **Access Key ID:** `your-access-key-id`
   - **Secret Access Key:** `your-secret-access-key`

**Keep this tab open** — you'll need these values in the next step.

### 3.5 Get Supabase API Keys (Optional — for frontend features)

1. Click **"Project Settings"** (gear icon)
2. Click **"API"** in the left sidebar
3. Under **"Project API keys"**, copy:
   - **Project URL:** `https://abc123xyz.supabase.co`
   - **anon public:** `eyJhbGc...` (long JWT string)

These are auto-filled if you use the Supabase Vercel integration, but optional for local dev.

---

## Step 4: Configure Environment Variables

### 4.1 Create .env.local File

```powershell
# Copy the example file
cp .env.local.example .env.local

# Open in your editor
code .env.local  # VS Code
# OR
notepad .env.local  # Notepad
```

### 4.2 Fill Required Values

Open `.env.local` and update these **REQUIRED** fields:

#### DATABASE_URL

Replace with your Supabase connection string from Step 3.2:

```env
DATABASE_URL=postgresql://postgres.abc123xyz:your-actual-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**⚠️ Common mistakes:**
- Using Session mode (port 5432) in serverless under high load can exhaust pool clients — prefer Transaction mode (6543) for runtime traffic
- Forgetting to URL-encode special characters in password (e.g., `@` → `%40`)
- Copying the template string instead of your actual connection string

#### OPENROUTER_API_KEY

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Click **"Create Key"**
3. Name it `hypermyths-dev`
4. Copy the key (starts with `sk-or-v1-`)
5. Paste into `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
OPENROUTER_FREE_MODEL=meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_MODEL=openai/gpt-4o-mini
TEXT_INFERENCE_PROVIDER=openrouter
```

HyperMyths tries OpenRouter free models first for script/prompt generation, then falls back to `OPENROUTER_MODEL` and paid defaults when the free tier is unavailable or rate-limited.

#### ELIZA_VIDEO_API_KEY

Use ElizaCloud as the first video provider for local trailer tests:

```env
ELIZA_VIDEO_API_KEY=eliza-your-actual-key-here
ELIZA_VIDEO_BASE_URL=https://www.elizacloud.ai
ELIZA_VIDEO_MODEL=fal-ai/minimax/hailuo-02/standard/text-to-video
ELIZA_VIDEO_RESOLUTION=768p
ELIZA_VIDEO_SIZE=1280x768
ELIZA_VIDEO_ASPECT_RATIO=5:3
VIDEO_PROVIDER_PRIORITY=eliza,xai,openrouter,fal,replicate,huggingface
```

#### XAI_API_KEY

1. Go to [console.x.ai](https://console.x.ai)
2. Navigate to **"API Keys"**
3. Create a new key (or copy existing one)
4. Paste into `.env.local`:

```env
XAI_API_KEY=xai-your-actual-key-here
```

#### Privy Authentication (Required for Premium /creator Route)

1. Go to [privy.io](https://privy.io) and sign in to your dashboard
2. Select your HyperMyths app (or create one — free tier works)
3. Copy the **App ID** from the dashboard header
4. Under **Settings → API Keys**, copy the **App Secret**
5. Under **Settings → Verification**, copy the **JWKS public key** (the full `-----BEGIN PUBLIC KEY-----` block)
6. Paste into `.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxxxxxxxxxx
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_JWT_VERIFICATION_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

**Without this:** The `/creator` premium route will return `401` for all requests. The free `/media` route works without Privy.

---

#### S3 Credentials

From Step 3.4, paste your Supabase S3 values:

```env
S3_ENDPOINT=https://abc123xyz.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=your-actual-access-key-id
S3_SECRET_ACCESS_KEY=your-actual-secret-access-key
```

#### Security Tokens

Generate random strings for auth tokens:

```powershell
# Generate WORKER_TOKEN
openssl rand -hex 32
# Output: a1b2c3d4e5f6... (64 chars)

# Generate VIDEO_API_KEY
openssl rand -hex 32
# Output: f6e5d4c3b2a1... (64 chars)

# Generate ADMIN_SECRET
openssl rand -hex 32
# Output: 1a2b3c4d5e6f... (64 chars)
```

**No OpenSSL?** Use this PowerShell command instead:

```powershell
# Generate random token
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Paste into `.env.local`:

```env
WORKER_TOKEN=paste-your-generated-token-here
VIDEO_API_KEY=paste-your-generated-token-here
ADMIN_SECRET=paste-your-generated-token-here
```

#### App Config

```env
APP_BASE_URL=http://localhost:3000
TRUST_PROXY_IP_HEADERS=false
ALLOW_IN_PROCESS_WORKER=true
```

### 4.3 Optional: X API (For MythX Testing)

If you want to test MythX biography videos:

1. Go to [developer.x.com](https://developer.x.com)
2. Create a developer account (free tier)
3. Create a new project/app
4. Get your **Bearer Token** (Read-only access is sufficient)
5. Paste into `.env.local`:

```env
X_API_BEARER_TOKEN=your-x-api-bearer-token-here
```

**Without this:** MythX videos will fail with a clear error message. Other video types (HashMyth, random prompts) will work fine.

### 4.4 Verify Configuration

```powershell
# Run environment validation
npm run env:check

# Expected output: "✅ All required environment variables are set"
# If errors: Review the missing/invalid vars and update .env.local
```

---

## Step 5: Run Database Migration

This creates all database tables (Job, Report, Video, RateLimit, etc.):

```powershell
# Run Prisma migration
npx prisma migrate deploy

# Expected output:
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "postgres"
# 
# 1 migration found in prisma/migrations
# Migration 20260412_video_render_request_persistence applied successfully!
```

**Verify tables were created:**

```powershell
# Optional: Connect to Supabase and list tables
# Or check in Supabase dashboard:
# 1. Go to Supabase → Table Editor
# 2. You should see: Job, Report, Video, VideoRender, RateLimit, etc.
```

**Common issues:**

| Error | Fix |
|-------|-----|
| `Can't reach database server` | Check DATABASE_URL host/port is correct (runtime usually 6543 transaction mode; direct DB tasks may use 5432 session mode) |
| `Invalid password` | Re-copy connection string from Supabase, ensure password is correct |
| `Migration already applied` | Safe to ignore — tables already exist |

---

## Step 6: Start Development Server

```powershell
# Start Next.js dev server
npm run dev

# Expected output:
#    ▲ Next.js 16.x.x (Turbopack)
#    - Local:        http://localhost:3000
#    - Network:      http://192.168.x.x:3000
# 
#  ✓ Ready in Xs
```

**Verify the server is running:**

Open your browser and navigate to:

1. **Homepage:** http://localhost:3000
   - Should show the HyperMyths landing page

2. **Free creator:** [http://localhost:3000/media](http://localhost:3000/media)
   - Public video generator — no login required

3. **Premium studio:** [http://localhost:3000/creator](http://localhost:3000/creator)
   - Redirects to `/login` if not authenticated via Privy

4. **API Health:** http://localhost:3000/api/service
   - Should return JSON with service manifest

**Expected behavior:**
- Pages load without errors
- No red error messages in terminal
- Terminal shows `✓ Compiled in Xms` when you make changes

**Common issues:**

| Error | Fix |
|-------|-----|
| `Port 3000 is already in use` | Kill existing process: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F` |
| `Missing required env vars` | Run `npm run env:check` and fix missing vars |
| `Database connection failed` | Verify DATABASE_URL and ensure Supabase project is active |

---

## Step 7: Test Core Features

### 7.1 Test Public Video Generation (/media)

1. Open [http://localhost:3000/media](http://localhost:3000/media)
2. Select **"Random"** or **"Prompt"** tab
3. Click **"Generate"**

**Expected behavior:**
1. Job is created (you'll see a job ID)
2. Job status transitions: `pending` → `processing` → `complete`
3. Video URL appears when ready (takes 1-5 minutes)
4. Video is uploaded to Supabase S3 and accessible via public URL

**What's happening behind the scenes:**
1. `POST /api/video/public-create` creates a job in PostgreSQL with status `pending`
2. Worker trigger (in-process) starts processing
3. OpenRouter generates a cinematic script (2 acts for public route)
4. Each scene is sent to the video provider fallback chain (OpenRouter → xAI → Fal → Replicate)
5. Clips are stitched together with FFmpeg
6. Final video is uploaded to Supabase S3
7. Job status updated to `complete` with video URL

**Troubleshooting:**

| Issue | Check | Fix |
|-------|-------|-----|
| Job stuck in "pending" | Terminal logs | Ensure `ALLOW_IN_PROCESS_WORKER=true` |
| Job stuck in "processing" | xAI API errors | Verify `XAI_API_KEY` is correct and has video access |
| "xAI video start failed" | xAI API response | Check xAI dashboard for quota/errors |
| "S3 upload failed" | S3 credentials | Verify S3_ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY |
| Video URL returns 404 | Supabase bucket | Ensure `videos` bucket is Public |

### 7.2 Test Premium Studio (/creator)

**⚠️ Requires:** Privy vars set in `.env.local` (Step 4 — Privy Authentication)

1. Open [http://localhost:3000/creator](http://localhost:3000/creator)
2. You will be redirected to `/login` — sign in with Google, Twitter, or another configured provider
3. After login you are redirected back to `/creator`
4. Select **"Generic Cinema"** pipeline
5. Use the act count selector to choose 3–10 acts
6. Enter a prompt and click **"Generate"**

**Expected behavior:**
- Job is created via `POST /api/video/create` with your chosen `sceneCount`
- The multi-act engine renders the exact number of scenes you selected
- Video completes with all acts stitched together

### 7.3 Test Token Address / Image-to-Video

1. Open [http://localhost:3000/media](http://localhost:3000/media)
2. Select the **"Token"** tab
3. Enter a Solana token contract address (e.g., a pump.fun token)
4. Click **"Generate"**

**Expected behavior:**
- DexScreener API fetches token metadata (name, symbol, image)
- Script generates a creative video about the token
- The token logo image is used as the starting frame for each scene (image-to-video)
- Final video uploaded to S3

**Troubleshooting:**
- If metadata fetch fails: Check token address is valid and exists on DexScreener
- Test DexScreener directly: `curl https://api.dexscreener.com/tokens/v1/solana/YOUR_TOKEN_ADDRESS`

### 7.4 Test MythX (X Profile Biography)

**⚠️ Requires:** `X_API_BEARER_TOKEN` set in `.env.local`

1. Open [http://localhost:3000/media](http://localhost:3000/media)
2. Select the **"MythX"** tab
3. Enter an X username (e.g., `elonmusk`)
4. Click **"Generate"**

**Expected behavior:**
1. X API fetches last 16 tweets from the profile
2. Script generates an autobiography video (3 acts)
3. Video renders with biography-first narrative
4. Final video uploaded to S3

**Troubleshooting:**
- "X API not configured": Set `X_API_BEARER_TOKEN` in `.env.local`
- "Profile not found": Verify username is correct (case-sensitive)
- Test X API directly: `curl https://api.x.com/2/users/by/username/elonmusk -H "Authorization: Bearer $X_API_BEARER_TOKEN"`

### 7.5 Test Job Status & Feed

1. Open [http://localhost:3000/feed](http://localhost:3000/feed)

**Expected behavior:**
- Shows list of all jobs with status indicators
- Updates every 3 seconds
- Clicking a job shows details (status, video URL, report)

**Verify job lifecycle:**
- Create a new video (Step 7.1)
- Watch it appear in the feed
- Status should progress: `pending` → `processing` → `complete`

---

## Step 8: Run Test Suite

```powershell
# Run all tests
npm test

# Expected output:
#  ✓ tests/workers.commands.test.ts (4 tests) 10ms
#  ✓ tests/video.client-polling.test.ts (1 test) 14ms
#  ✓ tests/jobs.recovery.test.ts (4 tests) 12ms
#  ...
#  Test Files  17 passed | 1 skipped (18)
#       Tests  43 passed | 3 skipped (46)
```

**What's tested:**
- Job recovery, retry, state machine
- Video service contract, scene planning, render retry
- Video client polling
- Security (request IP, webhook auth)
- Analytics engines, trade normalization
- Report generation (PDF, summary fallback)
- Worker commands

**Skipped tests:** `live.external-smoke.test.ts` — requires live API keys, safe to skip

---

## Step 9: TypeScript Verification

```powershell
# Run TypeScript type check
npx tsc --noEmit

# Expected output: (empty — no errors)
```

**Why this matters:** TypeScript catches type errors before runtime. Zero errors means the codebase is type-safe.

---

## Step 10: Build for Production (Optional)

```powershell
# Build production bundle
npm run build

# Expected output:
#  ✓ Compiled successfully
#  ✓ Collecting page data
#  ✓ Generating static pages (X/X)
#  ✓ Finalizing page shell
# 
# Route (app)                   Size  First Load JS
# ─ ○ /                         X kB         X kB
# ...
# 
# First Load JS shared by all:  X kB
```

**Note:** This creates a production build but doesn't start the server. For local testing, `npm run dev` is preferred (faster rebuilds, better error messages).

---

## Testing Workflow

### Quick Smoke Test (5 minutes)

Run this after every code change:

```powershell
# 1. Check env vars
npm run env:check

# 2. Run tests
npm test

# 3. Type check
npx tsc --noEmit

# 4. Start dev server
npm run dev

# 5. Open browser to http://localhost:3000
# 6. Create a test video (random prompt)
# 7. Verify video appears in feed
```

### Full Feature Test (20 minutes)

```powershell
# 1. Complete Steps 1-6 above
# 2. Test Chat (Step 7.1)
# 3. Test Random Video (Step 7.2) — wait for completion
# 4. Test HashMyth (Step 7.3) — use a known token address
# 5. Test MythX (Step 7.4) — use a known X username
# 6. Check Feed (Step 7.5) — verify all 3 videos appear
# 7. Run test suite (Step 8)
# 8. Verify TypeScript (Step 9)
```

---

## Troubleshooting Guide

### Database Issues

| Problem | Command | Fix |
|---------|---------|-----|
| Can't connect | `npx prisma db pull` | Verify DATABASE_URL is correct |
| Tables missing | `npx prisma migrate deploy` | Run migration |
| Migration fails | Check Supabase dashboard → Logs | Try direct/session URL (5432) for migration CLI while keeping runtime on transaction URL (6543) |

### API Issues

| Problem | Check | Fix |
|---------|-------|-----|
| OpenRouter returns 401 | `OPENROUTER_API_KEY` | Re-copy from openrouter.ai/keys |
| xAI returns 401 | `XAI_API_KEY` | Re-copy from console.x.ai |
| X API returns 401 | `X_API_BEARER_TOKEN` | Re-generate from developer.x.com |
| 503 "not configured" | `npm run env:check` | Fill missing required vars |

### Video Generation Issues

| Problem | Log Message | Fix |
|---------|-------------|-----|
| Job stuck in "pending" | No logs | Set `ALLOW_IN_PROCESS_WORKER=true` |
| Job stuck in "processing" | `xAI video start failed` | Check xAI API key/quotas |
| Video URL returns 404 | `s3_upload_failed` | Verify S3 credentials and bucket is Public |
| "Invalid JSON" from xAI | `xAI returned invalid JSON` | Check xAI API response in logs |
| Remotion render fails | `renderMedia failed` | Install ffmpeg: `winget install FFmpeg` |

### Memory/Performance Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Dev server slow | Turbopack cold start | Wait for initial compile, subsequent are fast |
| High memory usage | Node.js heap size | Increase: `NODE_OPTIONS="--max-old-space-size=4096" npm run dev` |
| Rate limit hit | Too many requests | Wait for window to reset (1 min for chat, 1 hr for jobs) |

---

## Architecture Reference

### Local Dev Architecture

```
┌──────────────────────────────────────┐
│  Next.js Dev Server (localhost:3000) │
│                                      │
│  Frontend: React pages              │
│  API Routes: /api/*                  │
│  Worker: In-process (no separate svc)│
└──────────┬───────────────────────────┘
           │ HTTP calls
           ▼
┌──────────────────────────────────────┐
│  External Services                   │
│                                      │
│  OpenRouter: Text/script generation │
│  xAI: Video clip generation         │
│  X API: Tweet scraping (optional)   │
│  DexScreener: Token metadata        │
└──────────────────────────────────────┘
           │ Upload/download
           ▼
┌──────────────────────────────────────┐
│  Supabase (Cloud)                    │
│                                      │
│  PostgreSQL: Job/report/video data  │
│  S3 Storage: Persistent video blobs │
└──────────────────────────────────────┘
```

### Video Pipeline Flow (Local)

```
User Input (localhost:3000/media  or  localhost:3000/creator)
  ↓
API Route (POST /api/video/public-create  or  POST /api/video/create)
  ↓
Job Created (PostgreSQL, status: pending, sceneCount stored)
  ↓
Worker Trigger (in-process, ALLOW_IN_PROCESS_WORKER=true)
  ↓
Script Generation (OpenRouter → cinematic script with N scenes)
  ↓
Video Provider Chain (ElizaCloud → xAI → OpenRouter → Fal → Replicate → HuggingFace)
  ↓  [token jobs: DexScreener image passed as imageUrl to each scene]
Download Clips (provider CDN → local temp)
  ↓
Stitch Video (FFmpeg → crossfade transitions between acts)
  ↓
Upload to S3 (Supabase Storage → public URL)
  ↓
Job Complete (PostgreSQL, status: complete, videoUrl: https://...)
  ↓
Result Returned to User (localhost:3000/job/[jobId])
```

---

## Environment Variable Reference

### Required for Local Testing

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `DATABASE_URL` | PostgreSQL connection | Supabase → Settings → Database |
| `OPENROUTER_API_KEY` | Text/script generation | openrouter.ai/keys |
| `OPENROUTER_FREE_MODEL` | Preferred free text/script model before paid fallback | OpenRouter model slug |
| `ELIZA_VIDEO_API_KEY` | Primary video clip generation via MiniMax Hailuo-02 Standard | elizacloud.ai |
| `XAI_API_KEY` | Video clip fallback | console.x.ai |
| `S3_ENDPOINT` | Supabase S3 endpoint | Supabase → Settings → Storage → S3 API |
| `S3_ACCESS_KEY_ID` | S3 access key | Supabase → Settings → Storage → S3 API |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | Supabase → Settings → Storage → S3 API |
| `WORKER_TOKEN` | Worker auth (random string) | Generate locally |
| `VIDEO_API_KEY` | Video API auth (random string) | Generate locally |
| `ALLOW_IN_PROCESS_WORKER` | Enable local worker | Set to `true` |
| `APP_BASE_URL` | Local dev URL | Set to `http://localhost:3000` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (premium `/creator` route) | Privy dashboard |
| `PRIVY_APP_SECRET` | Privy server-side secret | Privy dashboard → Settings → API Keys |
| `PRIVY_JWT_VERIFICATION_KEY` | Privy JWKS public key | Privy dashboard → Settings → Verification |
| `ARWEAVE_WALLET_JWK` | Optional cNFT metadata/poster permanence | Arweave/Turbo wallet |
| `IRYS_PRIVATE_KEY` | Legacy Irys uploader support | Only for older workers/scripts |

### Optional for Local Testing

| Variable | Purpose | Default if Not Set |
|----------|---------|-------------------|
| `X_API_BEARER_TOKEN` | X/Twitter API (MythX videos) | MythX fails gracefully |
| `GODMODE_API_BASE_URL` | G0DM0D3 orchestration layer | Falls back to direct OpenRouter |
| `ADMIN_SECRET` | Admin endpoint auth | Admin features disabled |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | Bot not started |
| `FAL_KEY` | Fal video provider fallback | Fal skipped in provider chain |
| `REPLICATE_API_TOKEN` | Replicate video provider fallback | Replicate skipped in provider chain |

### Do NOT Set Locally (Railway Only)

| Variable | Why Not Needed Locally |
|----------|------------------------|
| `DATABASE_URL` (Railway internal) | Use your Supabase connection string |
| `VIDEO_SERVICE_BASE_URL` | Video service runs in-process locally |

---

## Next Steps After Local Testing

Once you've verified everything works locally:

1. **Deploy to Vercel:**
   See `DEPLOY.md` for the full deployment walkthrough.

2. **Set production env vars** (same as `.env.local` but with production values)

3. **Run production migration:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Test production URL** (same smoke test as local)

---

## Support

- **Architecture:** `docs/BACKEND_ARCHITECTURE.md` — system diagram, job lifecycle, provider chain
- **Routes:** `docs/ROUTES_AND_OPERATIONS.md` — all API routes with request/response details
- **Agent context:** `AGENT.md` — AI agent operating contract for this repo
- **Claude Code:** `CLAUDE.md` — instructions for Claude Code working in this repo
- **Deployment:** `DEPLOY.md` and `RAILWAY.md` — full deploy walkthrough
- **GitHub Issues:** Report bugs at [github.com/asimog/HyperMyths/issues](https://github.com/asimog/HyperMyths/issues)

---

## Quick Reference Commands

```powershell
# Development
npm run dev                    # Start dev server
npm run env:check              # Validate env vars
npm test                       # Run test suite
npm run test:watch             # Watch mode
npx tsc --noEmit               # Type check

# Database
npx prisma migrate deploy      # Apply migrations
npx prisma studio              # Open Prisma GUI (localhost:5555)
npx prisma generate            # Regenerate Prisma client

# Build
npm run build                  # Production build
npm run start                  # Start production server (after build)

# Git
git status                     # Check changes
git pull origin main           # Pull latest
git push origin main           # Push changes
```

---

## Checklist: Before Declaring "Local Testing Complete"

- [ ] All required env vars set and validated (`npm run env:check`)
- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] Homepage loads (http://localhost:3000)
- [ ] Public route (`/media`) generates a video without login
- [ ] Token address input fetches DexScreener metadata and uses image for video
- [ ] Premium route (`/creator`) redirects to `/login` when unauthenticated
- [ ] Premium route accessible and generates video after Privy login
- [ ] Act count selector (3–10) works on premium route
- [ ] MythX video generates (with X username, if `X_API_BEARER_TOKEN` configured)
- [ ] Feed (`/feed`) shows completed videos
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)

**If all boxes checked:** ✅ Your local environment is production-ready.
