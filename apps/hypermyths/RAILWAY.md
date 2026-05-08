# HyperMyths — Railway + Vercel Deployment Guide

## Architecture

HyperMyths is split across two platforms:

```
┌─────────────────────┐
│   Vercel (Frontend) │
│   Next.js 16 app    │
│   SSR / Edge        │
└─────────┬───────────┘
          │  HTTPS
          ▼
┌──────────────────────────────────────────────┐
│              Railway (Backend)               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │  worker  │  │ godmode  │  │  video-    │ │
│  │ Docker   │  │ Docker   │  │  service   │ │
│  │ :8080    │  │ :7860    │  │  :8090     │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       └──────────────┴──────────────┘        │
│                      │                       │
│          ┌───────────┴────────────┐          │
│          │  PostgreSQL (managed)  │          │
│          └────────────────────────┘          │
│                                              │
│          ┌────────────────────────┐          │
│          │  Persistent Volume     │          │
│          │  /app/data/media       │          │
│          └────────────────────────┘          │
└──────────────────────────────────────────────┘
```

**Key points:**

- **Frontend:** Vercel (Next.js `output: "standalone"`, Privy auth for premium studio)
- **Backend:** Railway Docker services — worker, godmode, video-service
- **Text/orchestration:** G0DM0D3 on Railway (`OPENROUTER_API_KEY`)
- **Video generation:** OpenRouter (SeedancePro) → xAI → Fal → Replicate → HuggingFace (provider priority configurable)
- **Database:** Railway managed PostgreSQL
- **Media storage:** Supabase S3-compatible storage (recommended) or Railway Persistent Volume
- **Auth:** Privy (premium studio `/creator` + private job API)

---

## Step-by-Step Deployment

### Prerequisites

1. Push your code to a GitHub repo
2. Install Railway CLI: `npm i -g @railway/cli`
3. Create accounts: [Supabase](https://supabase.com), [Railway](https://railway.app), [Vercel](https://vercel.com), [Privy](https://privy.io)

---

### Step 1: Create Railway Project

```bash
railway login
railway init
# Name it: hypermyths
```

Or use the [Railway dashboard](https://railway.com/new).

---

### Step 2: Add PostgreSQL Database

1. In the Railway project canvas: **+ New** → **Database** → **Add PostgreSQL**
2. `DATABASE_URL` is auto-injected into all services
3. After first deploy, run migrations: `npx prisma migrate deploy`

---

### Step 3: Add Persistent Volume (optional — for local media storage)

If not using Supabase S3 for media:

1. **+ New** → **Persistent Volume**
2. Name: `media-storage`, Mount: `/app/data/media`, Size: `10 GB`
3. Attach to `worker` and `video-service`

---

### Step 4: Add Backend Services

Click **+ New** → **GitHub Repo** → select your repo for each service.

#### Service 1: `worker`

| Setting | Value |
|---------|-------|
| Dockerfile Path | `workers/Dockerfile` |
| Port | `8080` |

#### Service 2: `godmode` (Text/orchestration)

Clone from: `https://github.com/elder-plinius/G0DM0D3`

| Setting | Value |
|---------|-------|
| Dockerfile Path | `Dockerfile` |
| Port | `7860` |

#### Service 3: `video-service`

| Setting | Value |
|---------|-------|
| Dockerfile Path | `video-service/Dockerfile` |
| Port | `8090` |

---

### Step 5: Set Environment Variables

#### Worker service — required

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL |
| `APP_BASE_URL` | Your Vercel URL (e.g. `https://hypermyths.com`) |
| `WORKER_TOKEN` | `openssl rand -hex 32` — shared secret |
| `ELIZA_VIDEO_API_KEY` / `ELIZA_API_KEY` | [elizacloud.ai](https://www.elizacloud.ai/) — primary video provider |
| `ELIZA_VIDEO_MODEL` | `fal-ai/minimax/hailuo-02/standard/text-to-video` |
| `ELIZA_VIDEO_RESOLUTION` / `ELIZA_VIDEO_SIZE` | `768p` / `1280x768` |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) — script generation and video fallback |
| `OPENROUTER_FREE_MODEL` | Preferred free script model, e.g. `meta-llama/llama-3.3-70b-instruct:free` |
| `TEXT_INFERENCE_PROVIDER` | `openrouter` |
| `VIDEO_PROVIDER_PRIORITY` | `eliza,xai,openrouter,fal,replicate,huggingface` |
| `XAI_API_KEY` | [console.x.ai](https://console.x.ai/) — xAI video fallback |
| `S3_ENDPOINT` | Supabase S3 endpoint |
| `S3_ACCESS_KEY_ID` | Supabase S3 access key |
| `S3_SECRET_ACCESS_KEY` | Supabase S3 secret |
| `S3_BUCKET` | `videos` |
| `GODMODE_API_BASE_URL` | `http://godmode.railway.internal:7860/v1` |
| `GODMODE_API_KEY` | Random secret (same on godmode service) |
| `VIDEO_API_BASE_URL` | `http://video.railway.internal:8090` |
| `VIDEO_API_KEY` | `openssl rand -hex 32` |

#### Worker service — Privy (required for premium studio)

| Variable | Value |
|----------|-------|
| `PRIVY_APP_ID` | From [Privy dashboard](https://dashboard.privy.io) |
| `PRIVY_APP_SECRET` | From Privy dashboard — **never commit this** |
| `PRIVY_JWT_VERIFICATION_KEY` | JWKS public key from Privy dashboard |

#### Worker service — optional

| Variable | Purpose |
|----------|---------|
| `FAL_API_KEY` | Fal.ai video fallback |
| `REPLICATE_API_KEY` | Replicate video fallback |
| `HUGGINGFACE_API_KEY` | HuggingFace fallback |
| `COCKPIT_USERNAME` / `COCKPIT_PASSWORD` | Admin UI |
| `ADMIN_SECRET` | Admin API endpoints |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `X_API_BEARER_TOKEN` | X/Twitter read access |
| `X_API_CONSUMER_KEY` etc. | X/Twitter post access (OAuth 1.0a) |
| `AUTONOMOUS_CHAT_TOKEN` | Token-gate the autonomous chat endpoint |
| `VIDEO_STITCH_SCENE_COUNT` | Default act count for multi-act engine (3–10, default 3) |

#### Godmode service

| Variable | Value |
|----------|-------|
| `OPENROUTER_API_KEY` | OpenRouter key |
| `GODMODE_API_KEY` | Same secret as worker |
| `PORT` | `7860` |

#### Video service

Copy from worker: `DATABASE_URL`, `S3_*`, `VIDEO_API_KEY`, `ELIZA_*`, `OPENROUTER_*`, `XAI_*`, and `VIDEO_PROVIDER_PRIORITY`.

---

### Step 6: Deploy Frontend (Vercel)

1. [vercel.com/new](https://vercel.com/new) → import GitHub repo
2. Build command: `npm run build`, Output: `.next`
3. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Railway PostgreSQL **external** connection string |
| `APP_BASE_URL` | Your Vercel URL |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (public — safe to expose) |
| `NEXT_PUBLIC_PRIVY_LOGIN_METHODS` | `google,twitter,farcaster,discord,wallet` |
| `PRIVY_APP_SECRET` | Privy app secret (Vercel secret) |
| `PRIVY_JWT_VERIFICATION_KEY` | Privy JWKS public key (Vercel secret) |
| `WORKER_TOKEN` | Same as Railway worker |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Supabase S3 |
| `OPENROUTER_API_KEY` | For API routes that call providers directly |

---

### Step 7: Privy Setup

1. Go to [dashboard.privy.io](https://dashboard.privy.io)
2. Create an app — copy the **App ID** → `NEXT_PUBLIC_PRIVY_APP_ID`
3. Under **App Secret** → copy → `PRIVY_APP_SECRET` (Railway + Vercel secrets only)
4. Under **Verification Key** → copy JWKS public key → `PRIVY_JWT_VERIFICATION_KEY`
5. Add your production domain to **Allowed Origins**
6. Enable login methods: Google, Twitter, Farcaster, Discord, Wallet
7. Set OAuth redirect URL: `https://your-domain.com/login`

The `/creator` route and `POST /api/video/create` will not work without these three Privy variables.

---

### Step 8: Run Migrations

After first deploy, apply schema migrations:

```bash
# From Railway CLI (worker service shell):
npx prisma migrate deploy

# Or via your local machine with the Railway external DATABASE_URL:
DATABASE_URL="<railway-external-url>" npx prisma migrate deploy
```

---

### Step 9: Verify Deployment

```bash
# Frontend
curl https://your-app.vercel.app

# Worker health
curl https://your-worker.railway.app/health -H "Authorization: Bearer $WORKER_TOKEN"

# Video service
curl https://your-video.railway.app/healthz

# Godmode
curl https://your-godmode.railway.app/v1/health
```

---

## Bot Setup

### Telegram Bot

1. `/newbot` on `@BotFather` → copy token
2. Set `TELEGRAM_BOT_TOKEN` on worker service
3. Redeploy worker

### X (Twitter) Bot

1. Create app at [developer.x.com](https://developer.x.com/)
2. Generate Bearer Token → `X_API_BEARER_TOKEN`
3. OAuth 1.0a for posting → `X_API_CONSUMER_KEY`, `X_API_CONSUMER_SECRET`, `X_API_ACCESS_TOKEN`, `X_API_ACCESS_TOKEN_SECRET`
4. Redeploy worker

---

## Environment Variable Matrix

| Variable | Worker | Video | Vercel | Godmode |
|----------|--------|-------|--------|---------|
| `DATABASE_URL` | ✅ | ✅ | ✅ | — |
| `APP_BASE_URL` | ✅ | — | ✅ | — |
| `WORKER_TOKEN` | ✅ | — | ✅ | — |
| `ELIZA_API_KEY` / `ELIZA_VIDEO_API_KEY` | ✅ | ✅ | ✅ | — |
| `OPENROUTER_API_KEY` | ✅ | ✅ | ✅ | ✅ |
| `OPENROUTER_FREE_MODEL` | ✅ | ✅ | ✅ | — |
| `TEXT_INFERENCE_PROVIDER` | ✅ | ✅ | ✅ | — |
| `VIDEO_PROVIDER_PRIORITY` | ✅ | ✅ | ✅ | — |
| `XAI_API_KEY` | ✅ | ✅ | — | — |
| `S3_*` | ✅ | ✅ | ✅ | — |
| `GODMODE_API_BASE_URL` | ✅ | — | ✅ | — |
| `GODMODE_API_KEY` | ✅ | — | ✅ | ✅ |
| `PRIVY_APP_ID` | ✅ | — | — | — |
| `PRIVY_APP_SECRET` | ✅ | — | ✅ | — |
| `PRIVY_JWT_VERIFICATION_KEY` | ✅ | — | ✅ | — |
| `NEXT_PUBLIC_PRIVY_APP_ID` | — | — | ✅ | — |
| `VIDEO_API_BASE_URL` | ✅ | — | ✅ | — |
| `VIDEO_API_KEY` | ✅ | ✅ | ✅ | — |

---

## Cost Estimate

| Resource | Cost/mo |
|----------|---------|
| Vercel (Next.js frontend) | Free (Hobby) |
| Railway worker | $5–10 |
| Railway video-service | $10–20 |
| Railway godmode | $5–10 |
| Railway PostgreSQL | $5–10 |
| Persistent Volume (10 GB) | $1–2 |
| **Total** | **$26–52** |

Railway gives $5/mo credit → effective **$21–47/mo**.

---

## Troubleshooting

### Worker won't start

```bash
railway logs --service worker
```

Common causes:
- `DATABASE_URL` missing or wrong connection string
- No video provider key set. Production prefers `ELIZA_VIDEO_API_KEY`, then `XAI_API_KEY`, `OPENROUTER_API_KEY`, `FAL_API_KEY`, `REPLICATE_API_KEY`, or `HUGGINGFACE_API_KEY`.
- Env var contains empty string (Railway sets placeholder `""` → causes Bad env config error)

### Bad env config on startup

Railway sometimes sets unused env vars to `""`. The app sanitizes these via `trimOptionalEnvValue` in `lib/env.ts`. If you see `Bad env config: SOME_VAR` on startup, check that var in the Railway dashboard and either set a valid value or remove the empty entry.

### Video rendering fails

- Verify `VIDEO_API_BASE_URL` points to the video service internal DNS
- Check video service logs for FFmpeg errors
- Confirm Persistent Volume (or S3) is configured and accessible

### Privy auth not working

- Confirm `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, and `PRIVY_JWT_VERIFICATION_KEY` are set on both Railway and Vercel
- Confirm `NEXT_PUBLIC_PRIVY_APP_ID` is set on Vercel (public env var)
- Add your production domain to Privy allowed origins in the dashboard

### Jobs stuck in "pending"

- Check outbox: worker polls `JobDispatchOutbox` every few seconds
- Verify `WORKER_TOKEN` matches between Vercel and Railway worker
- Check worker logs for dispatch errors

---

## CI/CD

- **Railway:** Auto-deploys on push to connected GitHub branch
- **Vercel:** Auto-deploys on push; preview deployments per PR
- **Security scan:** `.github/workflows/security-checks.yml` runs `npm run secrets:scan` on every push to `main`

---

## What Was Removed

| Removed | Replacement |
|---------|-------------|
| Firebase Firestore | Railway PostgreSQL |
| Firebase Storage | Supabase S3 / Persistent Volume |
| Firebase Admin SDK | Prisma ORM |
| Solana payment flows | Removed entirely |
| x402 micropayment flows | Removed entirely |
| Dedicated payment address system | Privy-authenticated free access |
