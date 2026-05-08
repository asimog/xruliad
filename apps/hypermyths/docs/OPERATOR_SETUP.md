# HyperMyths — Operator Setup Guide

**Clean install. No pre-configured accounts. No migrations from old systems.**

---

## Prerequisites

1. **GitHub account** → [github.com](https://github.com)
2. **Vercel account** → [vercel.com](https://vercel.com)
3. **Supabase account** → [supabase.com](https://supabase.com)
4. **OpenRouter API key** → [openrouter.ai](https://openrouter.ai) (primary video + text)
5. **Privy account** → [privy.io](https://privy.io) (premium studio auth)

Optional (video fallbacks + social):

- **xAI API key** → [console.x.ai](https://console.x.ai)
- **Fal.ai API key** → [fal.ai](https://fal.ai/dashboard/keys)
- **Replicate API key** → [replicate.com](https://replicate.com/account/api-tokens)
- **Telegram Bot Token** → [@BotFather](https://t.me/BotFather)
- **X/Twitter API credentials** → [developer.x.com](https://developer.x.com)
- **Railway account** → [railway.com](https://railway.com) (worker + bots)

Optional (Solana cNFT minting):

- **Solana RPC** → [helius.dev](https://helius.dev) or [QuickNode](https://quicknode.com)
- **Arweave wallet** → generate a JWK wallet and fund it with AR or Turbo credits at [turbo.ardrive.io](https://turbo.ardrive.io) (permanent metadata storage)
- Metaplex Bubblegum merkle tree + collection (deploy once via `@metaplex-foundation/mpl-bubblegum`)

---

## Step 1: Fork the Repo

```bash
git clone https://github.com/asimog/HyperCinema.git
cd HyperCinema
```

Or fork on GitHub and clone your fork.

---

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `hypercinema`
3. Set a **database password** — save it
4. Choose region close to your users
5. Wait for provisioning (~2 minutes)

### Get Connection String

1. Go to **Project Settings → Database**
2. Under **Connection string**, select **URI** mode
3. Copy the string. It looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

### Create Storage Bucket

1. Go to **Storage** → **New bucket**
2. Name: `videos`
3. **Public**: toggle ON
4. Create

### Get S3 Credentials

1. Go to **Project Settings → Storage → S3 API**
2. Copy these 3 values:
   - **S3 Endpoint**: `https://[project-ref].supabase.co/storage/v1/s3`
   - **Access Key ID**
   - **Secret Access Key**

### Get Supabase API Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://[project-ref].supabase.co`)
   - **anon public** key
   - **service_role** key (secret — never expose to client)

---

## Step 3: Run Database Migration

```bash
# In your cloned repo
npm install

# Create .env.local with just DATABASE_URL
echo "DATABASE_URL=postgresql://..." > .env.local

# Run Prisma migration
npx prisma migrate deploy
```

This creates all tables: `Job`, `Report`, `Video`, `RateLimit`, etc.

---

## Step 4: Deploy to Vercel

### Option A: One-Click Deploy (Recommended)

Go to:
```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fasimog%2FHyperCinema&integrationIds=supabase
```

This auto-links Vercel + Supabase and pre-fills 4 env vars.

### Option B: Manual Deploy

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

---

## Step 5: Set Environment Variables

In Vercel → **Settings → Environment Variables**:

### Auto-filled by Supabase Integration (if using Option A)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Supabase connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key |

### You Must Add These Manually

| Variable | Value | Required? |
|----------|-------|-----------|
| `GODMODE_API_BASE_URL` | Your Railway `G0DM0D3` URL ending in `/v1` | ✅ |
| `GODMODE_API_KEY` | Shared secret used to call `G0DM0D3` | ✅ |
| `GODMODE_MODEL` | `ultraplinian/fast` | ✅ |
| `XAI_API_KEY` | Your xAI video key from console.x.ai | ✅ |
| `VIDEO_API_KEY` | Any random string (e.g., `vk-abc123`) | ✅ |
| `WORKER_TOKEN` | Any random string (e.g., `wt-xyz789`) | ✅ |
| `ALLOW_IN_PROCESS_WORKER` | `true` | ✅ |
| `APP_BASE_URL` | Your Vercel deployment URL | ✅ |
| `VIDEO_API_BASE_URL` | Same as `APP_BASE_URL` | ✅ |
| `S3_ENDPOINT` | `https://[project-ref].supabase.co/storage/v1/s3` | ✅ |
| `S3_ACCESS_KEY_ID` | From Supabase S3 settings | ✅ |
| `S3_SECRET_ACCESS_KEY` | From Supabase S3 settings | ✅ |

### Optional: Social bots

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `X_API_BEARER_TOKEN` | X API Bearer token |
| `X_API_CONSUMER_KEY` | X OAuth 1.0a consumer key |
| `X_API_CONSUMER_SECRET` | X OAuth 1.0a consumer secret |
| `X_API_ACCESS_TOKEN` | X OAuth 1.0a access token |
| `X_API_ACCESS_TOKEN_SECRET` | X OAuth 1.0a access token secret |

### Optional: Solana cNFT minting

Set these only if you want authenticated users to mint their trailers as compressed NFTs.

| Variable | Value |
|----------|-------|
| `SOLANA_RPC_URL` | Helius or QuickNode mainnet RPC URL |
| `SOLANA_DAS_RPC_URL` | RPC with DAS (Digital Asset Standard) support — can match `SOLANA_RPC_URL` |
| `SOLANA_MINT_AUTHORITY_SECRET` | Base58 or JSON array private key for the mint authority wallet. Also used to deterministically derive a unique per-job payment address — fund sweeps back to your treasury using this key. |
| `SOLANA_MINT_BUNDLE_PRICE_SOL` | Price per mint in SOL (e.g., `0.01`) |
| `SOLANA_MINT_PAYMENT_ADDRESS` | Legacy treasury address (optional — per-job addresses are derived automatically; this is only used as a UI fallback display value) |
| `CNFT_MERKLE_TREE_ADDRESS` | Address of a deployed Bubblegum merkle tree |
| `CNFT_COLLECTION_ADDRESS` | Metaplex collection mint address |
| `ARWEAVE_WALLET_JWK` | JSON string of an Arweave JWK wallet key (used by Turbo SDK for uploads) |
| `ARWEAVE_GATEWAY_URL` | Arweave gateway base URL (default: `https://arweave.net`) |
| `IRYS_PRIVATE_KEY` | Legacy Irys uploader key for older workers/scripts only |
| `IRYS_NETWORK` | Legacy Irys network (`mainnet` in production, `devnet` locally) |
| `IRYS_PROVIDER_URL` | Legacy Irys Solana RPC/provider URL |
| `IRYS_GATEWAY_URL` | Legacy Irys gateway URL (`https://gateway.irys.xyz`) |

After setting env vars, **redeploy** on Vercel.

---

## Step 6: Verify

1. Open your Vercel URL
2. **Chat** — type "hello" → AI should respond via `G0DM0D3`
3. **Generate** — type `@elonmusk` or a wallet address → click GENERATE → video queues
4. **Job status** — navigate to `/job/[jobId]` to watch progress

---

## Step 6B: Music Route Operations (`/music`)

The `/music` route is now an immersive local-first visualizer with playlist + simulation controls.

### Playlist files

Put your tracks in:

- `public/music/*.mp3`

Create:

- `public/music/playlist.json`

Example:

```json
{
  "tracks": [
    { "file": "track-01.mp3", "title": "Track 01" },
    { "file": "track-02.mp3", "title": "Track 02" }
  ]
}
```

### Simulation library files

You can extend simulations without code changes via:

- `public/music/simulations.json`

Example:

```json
{
  "simulations": [
    {
      "id": "custom-vortex",
      "name": "Custom Vortex",
      "physics": "Curl-advection with radial damping.",
      "description": "External preset merged into library.",
      "seedTag": "custom-vortex"
    }
  ]
}
```

Runtime behavior:

- Built-in simulation library includes **42 presets**
- Left/right arrows cycle simulation
- Random Scene button randomizes simulation + profile
- Local upload/drag-drop stays local in browser memory
- Song hash/seed drives deterministic visual identity
- User click on Enter modal unlocks autoplay

---

## Step 7: Railway (Optional — For 24/7 Bots)

Only needed if you want Telegram/X bots running continuously.

### Worker Service

1. New service on Railway → connect GitHub repo
2. Dockerfile path: `workers/Dockerfile`
3. Set env vars from `.env.worker` template
4. `DATABASE_URL` → use Supabase external connection (not Railway Postgres)

### G0DM0D3 Service

1. New service on Railway from `https://github.com/elder-plinius/G0DM0D3`
2. Use the repo root `Dockerfile`
3. Set:
   - `OPENROUTER_API_KEY`
   - `GODMODE_API_KEY`
   - `PORT=7860`
4. Point HyperMyths to it with:
   - `GODMODE_API_BASE_URL=http://godmode.railway.internal:7860/v1`
   - `GODMODE_API_KEY=...`
   - `GODMODE_MODEL=ultraplinian/fast`

### Video Service (Optional — Vercel handles video via /api/render/*)

1. New service on Railway → connect GitHub repo
2. Dockerfile path: `video-service/Dockerfile`
3. Set env vars from `.env.video-service` template
4. `VIDEO_API_KEY` must match Vercel's value

---

## Architecture

```
Vercel (www.yourdomain.com)
├── Next.js pages (frontend)
├── API routes (/api/jobs, /api/video/*, /api/render/*, /api/chat/*)
├── Worker trigger (/api/worker/trigger) — runs jobs in-process
└── Text calls to G0DM0D3, video calls to xAI

Supabase
├── PostgreSQL (jobs, reports, videos, rate limits)
└── S3 Storage (video blobs in "videos" bucket)

G0DM0D3 (Railway)
├── /v1/chat/completions — text/orchestration brain
└── Uses `OPENROUTER_API_KEY` server-side

xAI
└── grok-imagine-video (video generation)

Railway (optional)
├── G0DM0D3 service (text/orchestration)
├── Telegram bot (polling, 24/7)
└── X bot (mention polling, 24/7)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` connection fails | For Vercel/serverless runtime use Transaction mode (6543) + `?pgbouncer=true&connection_limit=1`; use Session mode (5432) for direct migration/debug flows |
| Chat returns errors | Check `GODMODE_API_BASE_URL` and `GODMODE_API_KEY`; confirm the Railway `G0DM0D3` service is healthy |
| Video generation fails | Verify `VIDEO_PROVIDER_PRIORITY=eliza,xai,openrouter,fal,replicate,huggingface` and at least one video provider key is set. ElizaCloud Hailuo-02 uses `ELIZA_VIDEO_API_KEY`, `ELIZA_VIDEO_MODEL=fal-ai/minimax/hailuo-02/standard/text-to-video`, `ELIZA_VIDEO_SIZE=1280x768`, and `ELIZA_VIDEO_RESOLUTION=768p`. |
| S3 upload fails | Verify `videos` bucket is **Public** and S3 credentials are correct |
| Job stuck in "pending" | Check `ALLOW_IN_PROCESS_WORKER=true` is set |
| Rate limit hit | Wait 1 minute, or increase limits in `lib/security/rate-limit.ts` |
| Mint fails with "payment not confirmed" | Payment flow: quote → confirm-payment (submit on-chain signature) → mint. Each step must complete in order. |
| Arweave upload fails | Check `ARWEAVE_WALLET_JWK` is valid JSON and the wallet has AR/Turbo credits. If running older Irys workers, check `IRYS_PRIVATE_KEY`, `IRYS_NETWORK`, and `IRYS_PROVIDER_URL`. |
| "URL resolves to a private address" on mint | The video/thumbnail URL must be a public HTTPS URL, not localhost or internal IP |

---

## Env Var Templates

Three template files are included in the repo:

| File | Purpose |
|------|---------|
| `.env.vercel` | Vercel frontend + API routes |
| `.env.worker` | Railway worker service |
| `.env.video-service` | Railway video service |

Copy the one you need, fill placeholders, paste into platform env settings.

---

## Security Notes

- Never commit `.env.*` files — they're in `.gitignore`
- `SUPABASE_SERVICE_KEY` is server-side only — never expose to client
- `VIDEO_API_KEY` and `WORKER_TOKEN` should be random, unguessable strings (generate with `openssl rand -hex 32`)
- All sensitive endpoints require Bearer auth
- `SOLANA_MINT_AUTHORITY_SECRET`, `ARWEAVE_WALLET_JWK`, and legacy `IRYS_PRIVATE_KEY` are hot wallet private keys — fund them with only the minimum needed for minting and storage fees
- Each job gets a **unique per-job payment address** derived from `SOLANA_MINT_AUTHORITY_SECRET + jobId` — cross-job signature replay is structurally impossible because each address is unique
- Each on-chain payment signature also has a `UNIQUE` DB constraint as a second layer of replay protection
- Remote asset URLs submitted for Arweave upload are validated: only `http/https` schemes, no private IP literals, 50 MB size cap, image/video content-types only
