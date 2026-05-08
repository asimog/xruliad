# Modular Multi-Provider Inference Engine

## Overview

HyperCinema now supports **multiple AI providers** for both text and video generation with automatic fallback chains. This allows cost optimization and high availability.

## Provider Priority Chains

### Text Inference (Cheapest → Most Expensive)
1. **ElizaOS** (Primary) — `gpt-4o-mini` via ElizaCloud API
   - Cost: Cheap (~$0.002/1K tokens)
   - Multi-model support (OpenAI, Anthropic, Google)
   - Auth: `ELIZA_API_KEY`

2. **HuggingFace** (Free Tier) — `mistralai/Mistral-7B-Instruct-v0.3`
   - Cost: Free (30k tokens/min rate limit)
   - Open-source models
   - Auth: `HUGGINGFACE_API_KEY`

3. **G0DM0D3** (Railway Orchestrator) — `ultraplinian/fast`
   - Cost: Moderate
   - Custom orchestration layer
   - Auth: `GODMODE_API_KEY`

4. **OpenRouter** (Emergency Fallback) — `openai/gpt-4o-mini`
   - Cost: Moderate
   - Direct access to many models
   - Auth: `OPENROUTER_API_KEY`

### Video Generation (Cheapest → Most Expensive)
1. **Fal.ai** (Cheapest) — `fal-ai/fast-svd`
   - Cost: Very cheap (~$0.01-0.05/video)
   - Any resolution support
   - Fast SVD models
   - Auth: `FAL_API_KEY`

2. **ElizaOS Video** — `minimax-video`, `runway`
   - Cost: Cheap
   - Multi-model gateway (MiniMax, Runway)
   - Auth: `ELIZA_VIDEO_API_KEY`

3. **Replicate** — `stability-ai/stable-video-diffusion`
   - Cost: Moderate (pay-per-second compute)
   - Stable, reliable
   - Auth: `REPLICATE_API_KEY`

4. **xAI** (Expensive) — `grok-imagine-video`
   - Cost: Expensive but high quality
   - Original provider
   - Auth: `XAI_VIDEO_API_KEY`

5. **Vast.ai** — Custom GPU instances
   - Cost: Cheap (GPU rental)
   - Not yet implemented
   - Auth: `VAST_API_KEY`

## Architecture

### Text Inference Flow
```
generateTextInference()
  ├─ Try ElizaOS (elizaChat)
  │   └─ If fails → Try HuggingFace
  │       └─ If fails → Try G0DM0D3
  │           └─ If fails → Try OpenRouter
  │               └─ If all fail → Throw combined error
```

### Video Generation Flow
```
renderCinematicVideoWithFallback()
  ├─ Try Fal.ai (generateFalVideo)
  │   └─ If fails → Try ElizaOS Video
  │       └─ If fails → Try Replicate
  │           └─ If fails → Try xAI
  │               └─ If all fail → Throw combined error
```

## Environment Variables

### Required (Pick at least ONE text provider)
```bash
# ElizaOS (Recommended - Primary)
ELIZA_API_KEY=eliza_your_key_here
ELIZA_BASE_URL=https://api.elizaos.cloud
ELIZA_MODEL=gpt-4o-mini

# HuggingFace (Free fallback)
HUGGINGFACE_API_KEY=hf_your_key_here
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.3

# Video Providers (Pick at least ONE)
FAL_API_KEY=your_fal_key
FAL_MODEL=fal-ai/fast-svd

ELIZA_VIDEO_API_KEY=eliza_your_key
ELIZA_VIDEO_MODEL=minimax-video

REPLICATE_API_KEY=your_replicate_key
REPLICATE_MODEL=stability-ai/stable-video-diffusion

XAI_VIDEO_API_KEY=xai_your_key
XAI_VIDEO_MODEL=grok-imagine-video
```

## API Endpoints

### ElizaOS (ElizaCloud)
- **Base URL**: `https://api.elizaos.cloud`
- **Text**: `POST /api/v1/chat`
- **Video**: `POST /api/v1/generate-video`
- **Auth**: `Authorization: Bearer <api_key>`
- **Docs**: https://www.elizacloud.ai

### HuggingFace
- **Base URL**: `https://api-inference.huggingface.co`
- **Text**: `POST /models/{model_id}`
- **Auth**: `Authorization: Bearer <hf_token>`
- **Docs**: https://huggingface.co/docs/inference-api

### Fal.ai
- **Base URL**: `https://fal.run`
- **Video**: `POST /{model_id}`
- **Auth**: `Authorization: Key <api_key>`
- **Docs**: https://fal.ai

### Replicate
- **Base URL**: `https://api.replicate.com`
- **Video**: `POST /v1/predictions`
- **Auth**: `Authorization: Bearer <api_token>`
- **Docs**: https://replicate.com/docs

### xAI
- **Base URL**: `https://api.x.ai/v1`
- **Video**: `POST /videos/generations`
- **Auth**: `Authorization: Bearer <api_key>`
- **Docs**: https://docs.x.ai

## Code Files

### Text Providers
- `lib/ai/eliza-text.ts` — ElizaOS client
- `lib/ai/huggingface.ts` — HuggingFace client
- `lib/ai/godmode.ts` — G0DM0D3 client (existing)
- `lib/ai/openrouter.ts` — OpenRouter client (existing)
- `lib/inference/text.ts` — Unified text dispatcher

### Video Providers
- `lib/video/eliza-video.ts` — ElizaOS video client
- `lib/video/fal-video.ts` — Fal.ai video client
- `lib/video/replicate-video.ts` — Replicate video client
- `lib/video/client.ts` — xAI video client (existing)
- `lib/video/dispatcher.ts` — Unified video dispatcher

### Configuration
- `lib/inference/providers.ts` — Provider registry
- `lib/inference/config.ts` — Runtime config resolution
- `lib/env.ts` — Environment variable validation

## Usage Examples

### Text Generation
```typescript
import { generateTextInference } from "@/lib/inference/text";

const response = await generateTextInference({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing." },
  ],
  temperature: 0.2,
  maxTokens: 1200,
});
```

### Video Generation with Fallback
```typescript
import { renderCinematicVideoWithFallback } from "@/lib/video/dispatcher";

const result = await renderCinematicVideoWithFallback({
  jobId: "job-123",
  wallet: "0xabc...",
  durationSeconds: 5,
  prompt: "A futuristic city with flying cars at night",
});

console.log(result.videoUrl); // Video URL from first successful provider
console.log(result.provider); // Which provider succeeded
```

### Video Generation with Specific Provider
```typescript
import { generateVideoWithProvider } from "@/lib/video/dispatcher";

const result = await generateVideoWithProvider("fal", {
  jobId: "job-123",
  wallet: "0xabc...",
  durationSeconds: 5,
  prompt: "A serene mountain landscape",
});
```

## Cost Optimization

### Current Setup (Cheapest First)
- **Text**: ElizaOS (gpt-4o-mini) → HuggingFace (free) → G0DM0D3 → OpenRouter
- **Video**: Fal.ai (fast-svd) → ElizaOS (minimax) → Replicate → xAI

### Expected Costs
| Provider | Text Cost | Video Cost |
|----------|-----------|------------|
| ElizaOS | ~$0.002/1K tokens | ~$0.10-0.50/video |
| HuggingFace | FREE | N/A |
| Fal.ai | N/A | ~$0.01-0.05/video |
| Replicate | N/A | ~$0.05-0.20/video |
| xAI | N/A | ~$0.50-2.00/video |

## Testing

### Test Text Inference
```bash
# Will use ElizaOS first, then fallback chain
node -e "
const { generateTextInference } = require('./lib/inference/text');
generateTextInference({
  messages: [{ role: 'user', content: 'Hello!' }],
}).then(console.log);
"
```

### Test Video Generation
```bash
# Will use Fal.ai first, then fallback chain
node -e "
const { renderCinematicVideoWithFallback } = require('./lib/video/dispatcher');
renderCinematicVideoWithFallback({
  jobId: 'test-123',
  wallet: 'test-wallet',
  durationSeconds: 3,
  prompt: 'A test video',
}).then(console.log);
"
```

## Migration Notes

### From xAI-Only to Multi-Provider
1. **No breaking changes** — existing code continues to work
2. xAI is now in the fallback chain (position 4)
3. New providers are tried first (cheaper options)
4. To force xAI, use `generateVideoWithProvider("xai", params)`

### Adding New Providers
1. Add provider to `lib/inference/providers.ts` registry
2. Create client in `lib/ai/{provider}-text.ts` or `lib/video/{provider}-video.ts`
3. Add env vars to `lib/env.ts`
4. Update dispatcher in `lib/inference/text.ts` or `lib/video/dispatcher.ts`
5. Add to fallback chain in config

## Troubleshooting

### "No text inference providers configured"
- Set at least one: `ELIZA_API_KEY`, `HUGGINGFACE_API_KEY`, `GODMODE_API_KEY`, or `OPENROUTER_API_KEY`

### "All video providers failed"
- Check env vars for at least one video provider
- Review logs to see which providers failed and why
- Try specific provider directly to isolate issue

### ElizaOS Not Working
- Verify API key format: `eliza_...`
- Check base URL: `https://api.elizaos.cloud`
- Test with: `curl -H "Authorization: Bearer $ELIZA_API_KEY" https://api.elizaos.cloud/api/v1/models`

## Future Enhancements

- [ ] Implement Vast.ai GPU rental provider
- [ ] Add provider health checks
- [ ] Dynamic provider selection based on load
- [ ] A/B testing between providers
- [ ] Cost tracking per provider
- [ ] Rate limit management
- [ ] Custom model support per provider
