// Video service config — Multi-provider support
// Providers: xAI, ElizaOS, Fal.ai, Replicate, Vast.ai
import { z } from "zod";

// Trim whitespace from env strings
function trim(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim() : value;
}

const schema = z.object({
  // Server port
  PORT: z.coerce.number().int().positive().default(8090),
  // Auth key for render API
  VIDEO_API_KEY: z.string().min(1),
  // Public base URL for status links in responses
  VIDEO_SERVICE_BASE_URL: z.string().url().optional(),

  // xAI video generation
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),

  // ElizaOS video generation
  ELIZA_API_KEY: z.string().min(1).optional(),
  ELIZA_CLOUD_API_KEY: z.string().min(1).optional(),
  ELIZA_BASE_URL: z.string().url().optional(),
  ELIZA_VIDEO_API_KEY: z.string().min(1).optional(),
  ELIZA_VIDEO_BASE_URL: z
    .string()
    .url()
    .default("https://www.elizacloud.ai")
    .optional(),
  ELIZA_VIDEO_MODEL: z
    .string()
    .min(1)
    .default("fal-ai/minimax/hailuo-02/standard/text-to-video")
    .optional(),
  ELIZA_VIDEO_RESOLUTION: z.string().min(1).default("768p").optional(),
  ELIZA_VIDEO_SIZE: z.string().min(1).default("1280x768").optional(),
  ELIZA_VIDEO_ASPECT_RATIO: z.string().min(1).default("5:3").optional(),
  ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK: z.coerce.boolean().default(false),

  // Fal.ai video generation
  FAL_API_KEY: z.string().min(1).optional(),
  FAL_BASE_URL: z.string().url().default("https://fal.run").optional(),
  FAL_MODEL: z.string().min(1).default("fal-ai/fast-svd").optional(),

  // Replicate video generation
  REPLICATE_API_KEY: z.string().min(1).optional(),
  REPLICATE_MODEL: z
    .string()
    .min(1)
    .default("stability-ai/stable-video-diffusion")
    .optional(),

  // Vast.ai (GPU rental)
  VAST_API_KEY: z.string().min(1).optional(),
  VAST_BASE_URL: z.string().url().optional(),
  VAST_MODEL: z.string().min(1).optional(),

  // How often to poll for clip status
  VIDEO_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
  // Max poll attempts before timeout
  VIDEO_MAX_POLL_ATTEMPTS: z.coerce.number().int().min(1).default(180),

  // Max seconds per clip — longer scenes split into chunks
  MAX_CLIP_SECONDS: z.coerce.number().int().min(2).max(30).default(8),

  // Path to ffmpeg binary
  FFMPEG_PATH: z.string().min(1).default("ffmpeg"),

  // Optional comma-separated fallback order: eliza,xai,fal,replicate
  VIDEO_PROVIDER_PRIORITY: z.string().min(1).optional(),

  // S3-compatible storage (Supabase Storage)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).default("videos"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  // Override public URL base if CDN or custom domain
  S3_PUBLIC_URL: z.string().url().optional(),

  // How often recovery loop runs
  RENDER_RECOVERY_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .default(30_000),
  // Stale render threshold — reclaim if stuck this long
  RENDER_STALE_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .default(5 * 60_000),
  // Max renders to recover per batch
  RENDER_RECOVERY_BATCH_LIMIT: z.coerce.number().int().positive().default(20),
});

export type VideoServiceEnv = z.infer<typeof schema>;

// Cached after first parse
let cached: VideoServiceEnv | null = null;

export function getVideoServiceEnv(): VideoServiceEnv {
  if (cached) return cached;

  const elizaApiKey =
    trim(process.env.ELIZA_VIDEO_API_KEY) ??
    trim(process.env.ELIZA_API_KEY) ??
    trim(process.env.ELIZA_CLOUD_API_KEY);
  const elizaBaseUrl =
    trim(process.env.ELIZA_VIDEO_BASE_URL) ??
    trim(process.env.ELIZA_BASE_URL);

  const parsed = schema.safeParse({
    ...process.env,
    XAI_API_KEY: trim(process.env.XAI_API_KEY),
    XAI_BASE_URL: trim(process.env.XAI_BASE_URL),
    XAI_VIDEO_MODEL: trim(process.env.XAI_VIDEO_MODEL),
    ELIZA_API_KEY: trim(process.env.ELIZA_API_KEY),
    ELIZA_CLOUD_API_KEY: trim(process.env.ELIZA_CLOUD_API_KEY),
    ELIZA_BASE_URL: trim(process.env.ELIZA_BASE_URL),
    ELIZA_VIDEO_API_KEY: elizaApiKey,
    ELIZA_VIDEO_BASE_URL: elizaBaseUrl,
    ELIZA_VIDEO_MODEL: trim(process.env.ELIZA_VIDEO_MODEL),
    ELIZA_VIDEO_RESOLUTION: trim(process.env.ELIZA_VIDEO_RESOLUTION),
    ELIZA_VIDEO_SIZE: trim(process.env.ELIZA_VIDEO_SIZE),
    ELIZA_VIDEO_ASPECT_RATIO: trim(process.env.ELIZA_VIDEO_ASPECT_RATIO),
    ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK: trim(
      process.env.ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK,
    ),
    FAL_API_KEY: trim(process.env.FAL_API_KEY),
    FAL_BASE_URL: trim(process.env.FAL_BASE_URL),
    FAL_MODEL: trim(process.env.FAL_MODEL),
    REPLICATE_API_KEY: trim(process.env.REPLICATE_API_KEY),
    REPLICATE_MODEL: trim(process.env.REPLICATE_MODEL),
    VAST_API_KEY: trim(process.env.VAST_API_KEY),
    VAST_BASE_URL: trim(process.env.VAST_BASE_URL),
    VAST_MODEL: trim(process.env.VAST_MODEL),
    S3_ENDPOINT: trim(process.env.S3_ENDPOINT),
    S3_ACCESS_KEY_ID: trim(process.env.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: trim(process.env.S3_SECRET_ACCESS_KEY),
    S3_PUBLIC_URL: trim(process.env.S3_PUBLIC_URL),
    VIDEO_SERVICE_BASE_URL: trim(process.env.VIDEO_SERVICE_BASE_URL),
    VIDEO_PROVIDER_PRIORITY: trim(process.env.VIDEO_PROVIDER_PRIORITY),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Bad video-service config: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
