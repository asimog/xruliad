# HyperMyths

HyperMyths is a Next.js 16 generative cinema platform. Users submit prompts, X profiles, or token contract addresses and receive AI-rendered short films. The platform includes a public free tier, a Privy-authenticated premium studio, autonomous job monitoring, multi-provider video rendering, and the MythX audio-reactive engine.

## Product Surface

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page with studio entry points |
| `/media` | Public (rate-limited) | Free 2-act cinema — prompts, X profiles, token addresses |
| `/login` | Public | Privy sign-in for premium studio access |
| `/creator` | Authenticated | Premium Multi-Act Engine (3–10 acts) + Classic 2-Act Cinema |
| `/chat` | Public | Concierge-style guided generation |
| `/feed` | Public | Live job stream with embedded video playback |
| `/job/[jobId]` | Public / gated | Job status, report, and video playback |
| `/music` | Public | MythX audio-reactive visual engine (local files + YouTube) |
| `/trailer/[slug]` | Public / gated | Permanent trailer page for minted cNFT assets |

## Authentication

HyperMyths uses [Privy](https://privy.io) for premium studio authentication. The `/creator` route and `/api/video/create` endpoint require a valid Privy access token.

- Free tier: `/media` (public, IP rate-limited, 1 req/24h)
- Premium tier: `/creator` (Privy-authenticated, private jobs)

Set `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_SECRET` in your environment. See [DEPLOY.md](DEPLOY.md) for full setup.

## Core Workflows

1. A client route creates a job through one of the `/api/video/*` endpoints or `POST /api/jobs`.
2. The job and a dispatch outbox record are stored in Prisma/PostgreSQL.
3. The worker service polls the outbox and drives the pipeline in `workers/`.
4. Video clips are rendered via the configured provider chain. Production defaults prefer ElizaCloud MiniMax Hailuo-02 Standard first, then xAI/OpenRouter/Fal/Replicate/HuggingFace fallbacks.
5. For multi-act jobs, scenes are rendered individually and stitched with FFmpeg.
6. Rendered assets are uploaded to S3-compatible storage (Supabase Storage).
7. `/api/jobs/[jobId]`, `/api/video/[jobId]`, `/feed`, and `/job/[jobId]` surface state to the client.

### Optional: cNFT Minting

Authenticated users can mint their completed trailer as a Solana compressed NFT:

1. Request a payment quote via `POST /api/assets/[jobId]/quote`.
2. Send SOL to the treasury address and submit the signature via `POST /api/assets/[jobId]/confirm-payment`.
3. Call `POST /api/assets/[jobId]/mint` — the worker uploads poster + metadata to Arweave permanent storage through Turbo and mints a cNFT via Metaplex Bubblegum.
4. The minted asset is viewable at `/trailer/[slug]`.

Required env vars: `SOLANA_RPC_URL`, `SOLANA_MINT_AUTHORITY_SECRET` (also used to derive per-job payment addresses), `CNFT_MERKLE_TREE_ADDRESS`, `CNFT_COLLECTION_ADDRESS`, `ARWEAVE_WALLET_JWK`. Legacy Irys env vars remain in templates for older workers/scripts that still import the Irys uploader.

Each job gets a unique destination payment address derived deterministically from `SOLANA_MINT_AUTHORITY_SECRET + jobId`, making cross-job signature replay structurally impossible.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4 |
| Auth | Privy (`@privy-io/react-auth`) |
| Database | Prisma 7 + PostgreSQL |
| Job Queue | Custom outbox pattern (PostgreSQL-backed) |
| Video Providers | ElizaCloud MiniMax Hailuo-02 Standard, xAI, OpenRouter, Fal, Replicate, HuggingFace |
| Text Providers | OpenRouter free-tier models first, OpenRouter paid fallback, ElizaOS, G0DM0D3, HuggingFace |
| Storage | Supabase S3-compatible object storage |
| Video Processing | FFmpeg (scene stitching), Remotion |
| NFT Minting | Metaplex cNFT (compressed NFT), Arweave permanent storage (Turbo SDK) |
| Blockchain | Solana (payment verification, cNFT minting) |
| 3D / Audio | Three.js, React Three Fiber |
| Testing | Vitest |

## Quick Start

```bash
npm install
cp .env.example.railway .env.local   # fill in required vars
npm run env:check
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`.

Required env vars for local dev: `DATABASE_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `OPENROUTER_API_KEY` for script generation, and at least one video provider key (`ELIZA_VIDEO_API_KEY`, `ELIZA_API_KEY`, `XAI_API_KEY`, `FAL_API_KEY`, or `REPLICATE_API_KEY`).

## Scripts

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run start            # Start standalone server
npm run db:migrate       # Apply pending Prisma migrations
npm run env:check        # Validate required env vars
npm run secrets:scan     # Scan tracked files for leaked credentials

npm test                 # Run Vitest test suite
npm run test:watch       # Vitest watch mode
npm run test:live        # Live integration tests

npm run video:dev        # Start video-service in dev mode
npm run video:build      # Compile video-service TypeScript
npm run video:start      # Start compiled video-service
```

## Main API Routes

### Video Creation
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/video/create` | Privy | Premium — prompts, X profiles, token addresses |
| `POST` | `/api/video/public-create` | None (rate-limited) | Free 2-act cinema |
| `POST` | `/api/video/mythx` | None | MythX X-profile biography |
| `POST` | `/api/video/random` | None (rate-limited) | Random prompt render |

### Job Management
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/jobs/[jobId]` | Owner or public | Fetch job, report, video |
| `POST` | `/api/jobs/[jobId]/retry` | None (rate-limited) | Retry a failed job |
| `POST` | `/api/jobs/[jobId]/trigger` | None | Manually trigger a stuck job |
| `DELETE` | `/api/jobs` | Admin secret | Delete failed jobs only |

### Media & Reports
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/video/[jobId]` | Owner or public | Inline/download video with signed URL fallback |
| `GET` | `/api/report/[jobId]` | Owner or public | Fetch report output |
| `GET` | `/api/autonomous/feed` | None | SSE live job stream |
| `POST` | `/api/youtube/resolve` | None | Normalize YouTube URLs for MythX |

Full route detail: [docs/ROUTES_AND_OPERATIONS.md](docs/ROUTES_AND_OPERATIONS.md)

## Video Pipeline

```
User Input (prompt / X profile / token address)
      │
      ▼
  /api/video/create  ──────── Privy auth check
      │
      ▼
  createJob()  ──────── PostgreSQL + outbox entry
      │
      ▼
  Worker polls outbox
      │
      ├── Single-clip path ──► renderCinematicVideoWithFallback()
      │                              │
      └── Multi-act path ──► generateMultiActVideo()
                                    │
                              ┌─────┴─────┐
                              │ per-scene │  (3–10 scenes)
                              │  render   │
                              └─────┬─────┘
                                    │
                              FFmpeg stitch
                                    │
                              Upload to S3
```

Provider priority (configurable via `VIDEO_PROVIDER_PRIORITY`): `eliza → xai → openrouter → fal → replicate → huggingface`

Script generation uses `TEXT_INFERENCE_PROVIDER=openrouter` in production. The OpenRouter client tries `OPENROUTER_FREE_MODEL` and the built-in free model pool first, then falls back to `OPENROUTER_MODEL` and paid defaults if free models are unavailable or rate-limited.

When a token address is submitted, DexScreener metadata is fetched and the token image is passed as `imageUrl` to the video provider for image-to-video generation.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy app ID (public) |
| `PRIVY_APP_SECRET` | Yes (server) | Privy app secret (Railway/Vercel secret) |
| `PRIVY_JWT_VERIFICATION_KEY` | Yes (server) | Privy JWKS public key |
| `ELIZA_VIDEO_API_KEY` / `ELIZA_API_KEY` | Recommended | ElizaCloud video gateway — MiniMax Hailuo-02 Standard (`1280x768`, `768p`, 6–10s) |
| `OPENROUTER_API_KEY` | Recommended | Script/text generation; free models are tried before paid fallback |
| `OPENROUTER_FREE_MODEL` | Optional | Preferred OpenRouter free model, default `meta-llama/llama-3.3-70b-instruct:free` |
| `OPENROUTER_MODEL` | Optional | Paid fallback text model, default `openai/gpt-4o-mini` |
| `XAI_API_KEY` | Optional | xAI Grok video key |
| `FAL_API_KEY` | Optional | Fal.ai video key |
| `S3_ENDPOINT` | Yes | Supabase S3 endpoint |
| `S3_ACCESS_KEY_ID` | Yes | S3 access key |
| `S3_SECRET_ACCESS_KEY` | Yes | S3 secret key |
| `WORKER_TOKEN` | Yes | Shared secret for worker trigger endpoint |
| `APP_BASE_URL` | Yes | Canonical URL (e.g. `https://hypermyths.com`) |
| `ARWEAVE_WALLET_JWK` | Minting only | Arweave JWK JSON used by Turbo SDK for permanent NFT metadata/poster uploads |
| `IRYS_PRIVATE_KEY` | Legacy only | Irys upload key for older workers/scripts; current mint path uses Arweave/Turbo |

Full variable reference: `.env.example.railway`

## Safety Notes

- The DELETE `/api/jobs` endpoint refuses to delete anything except `status=failed` jobs. No bulk wipe possible.
- Private jobs (`visibility: private`) are only accessible to the authenticated creator. Video and report endpoints enforce owner checks.
- All external credentials come from environment variables — no hardcoded secrets in the codebase.
- `npm run secrets:scan` runs on every push to `main` via GitHub Actions.
- Rate limiting is enforced at the API layer for all public endpoints.

## Testing

```bash
npm test
```

Vitest coverage in `tests/` includes:
- Job route resilience and retry behavior
- Video pipeline contract and render-retry logic
- YouTube URL normalization
- Security helpers (rate limiter, crypto)
- Feed and cleanup regressions

## Repository Map

```
app/                 Next.js App Router — pages and API handlers
components/          Client UI components
lib/jobs/            Job state machine, outbox, retry, repository
lib/video/           Video provider dispatch, polling, pipeline
lib/memecoins/       Token metadata resolution (DexScreener)
lib/ai/              Script generation and LLM clients
lib/auth/            Privy server-side auth helpers
lib/storage/         S3 upload, signed URL generation
lib/security/        Rate limiting, request IP, crypto utils
workers/             Background job execution (Railway Docker service)
video-service/       Optional standalone render service
prisma/              Prisma schema and migrations
tests/               Vitest regression coverage
docs/                Architecture and operational documentation
```

## Docs

- [DEPLOY.md](DEPLOY.md) — step-by-step deployment guide (Supabase + Railway + Vercel)
- [RAILWAY.md](RAILWAY.md) — Railway architecture, service config, environment matrix
- [docs/ROUTES_AND_OPERATIONS.md](docs/ROUTES_AND_OPERATIONS.md) — full API route reference
- [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) — job pipeline internals
- [docs/LOCAL_TESTING_GUIDE.md](docs/LOCAL_TESTING_GUIDE.md) — local dev and test setup
- [docs/OPERATOR_SETUP.md](docs/OPERATOR_SETUP.md) — production operator guide
- [docs/MYTHX_INTEGRATION.md](docs/MYTHX_INTEGRATION.md) — MythX audio engine
- [docs/privy-production.md](docs/privy-production.md) — Privy rollout phases

## License

Private. All rights reserved.
