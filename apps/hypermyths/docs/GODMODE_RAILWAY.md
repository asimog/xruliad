# G0DM0D3 on Railway

HyperMyths now expects a separate Railway service for text/orchestration.

## Goal

- `G0DM0D3` is the cloud brain for chat, report generation, script writing, and scene-direction prompts.
- `xAI` stays dedicated to video generation.
- `OPENROUTER_API_KEY` lives on the `G0DM0D3` service, not in the browser.

## Railway Service

Create a new Railway service named `godmode` from:

```text
https://github.com/elder-plinius/G0DM0D3
```

Use either of these deploy modes:

1. Dockerfile at repo root
2. Build from source with start command `npm run api`

`G0DM0D3` serves its OpenAI-compatible API on port `7860` and exposes:

- `GET /v1/health`
- `POST /v1/chat/completions`

## Variables on the G0DM0D3 service

```bash
OPENROUTER_API_KEY=sk-or-v1-...
GODMODE_API_KEY=generate-a-random-secret-here
PORT=7860
```

Optional dataset/research vars belong there too, not in HyperMyths:

```bash
HF_TOKEN=
HF_DATASET_REPO=
```

## Variables on HyperMyths

Point HyperMyths at the internal Railway URL for the `godmode` service:

```bash
GODMODE_API_BASE_URL=http://godmode.railway.internal:7860/v1
GODMODE_API_KEY=generate-a-random-secret-here
GODMODE_MODEL=ultraplinian/fast
```

Recommended defaults:

- `GODMODE_MODEL=ultraplinian/fast` for the autonomous orchestrator path
- `OPENROUTER_API_KEY` left blank on HyperMyths unless you want a direct emergency bypass

## Current Routing

- `lib/inference/text.ts` -> `G0DM0D3` primary
- `app/api/chat/stream/route.ts` -> `G0DM0D3` streaming primary
- `video-service/` -> `xAI` only

## Sanity Checks

From HyperMyths service logs, text calls should go to:

```text
http://godmode.railway.internal:7860/v1/chat/completions
```

From the video service, video calls should still go to:

```text
https://api.x.ai/v1/videos/generations
```
