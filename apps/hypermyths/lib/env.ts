// Production env validation with Zod — Multi-provider support
// Text: ElizaOS, HuggingFace, G0DM0D3, OpenRouter
// Video: Fal.ai, ElizaOS, Replicate, xAI, Vast.ai
import { z } from "zod";

function trimEnvValue(value: string | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : undefined;
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function trimOptionalEnvValue(value: string | undefined): string | undefined {
  const trimmed = trimEnvValue(value);
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const envSchema = z.object({
  // ── ElizaOS (primary text + video) ─────────────────────────────
  ELIZA_API_KEY: z.string().min(1).optional(),
  ELIZA_CLOUD_API_KEY: z.string().min(1).optional(),
  ELIZA_BASE_URL: z.string().url().default("https://www.elizacloud.ai"),
  ELIZA_API_BASE_URL: z.string().url().optional(),
  ELIZA_MODEL: z.string().min(1).optional(),
  ELIZA_VIDEO_API_KEY: z.string().min(1).optional(),
  ELIZA_VIDEO_BASE_URL: z.string().url().optional(),
  ELIZA_VIDEO_API_BASE_URL: z.string().url().optional(),
  ELIZA_VIDEO_MODEL: z
    .string()
    .min(1)
    .default("bytedance/seedance-2.0/fast/text-to-video"),
  ELIZA_VIDEO_RESOLUTION: z.string().min(1).default("480p"),
  ELIZA_VIDEO_SIZE: z.string().min(1).default("832x480"),
  ELIZA_VIDEO_ASPECT_RATIO: z.string().min(1).default("16:9"),
  ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK: z.coerce.boolean().default(false),

  // ── HuggingFace (free text inference + video via Inference Providers) ──
  HUGGINGFACE_API_KEY: z.string().min(1).optional(),
  HUGGINGFACE_BASE_URL: z.string().url().optional(),
  HUGGINGFACE_MODEL: z.string().min(1).optional(),
  HF_VIDEO_MODEL: z.string().min(1).default("Wan-AI/Wan2.1-T2V-14B"),
  HF_VIDEO_INFERENCE_PROVIDER: z.string().min(1).default("fal-ai"),
  HF_VIDEO_MAX_WAIT_MS: z.coerce.number().int().min(10000).default(600000),

  // ── Fal.ai (cheapest video) ────────────────────────────────────
  FAL_API_KEY: z.string().min(1).optional(),
  FAL_BASE_URL: z.string().url().default("https://fal.run"),
  FAL_MODEL: z.string().min(1).optional(),

  // ── Replicate (video models) ───────────────────────────────────
  REPLICATE_API_KEY: z.string().min(1).optional(),
  REPLICATE_MODEL: z.string().min(1).optional(),

  // ── Vast.ai (GPU rental) ───────────────────────────────────────
  VAST_API_KEY: z.string().min(1).optional(),
  VAST_BASE_URL: z.string().url().optional(),
  VAST_MODEL: z.string().min(1).optional(),

  // ── G0DM0D3 orchestrator (text) ────────────────────────────────
  GODMODE_API_BASE_URL: z.string().url().optional(),
  GODMODE_API_KEY: z.string().min(1).optional(),
  GODMODE_MODEL: z.string().min(1).optional(),

  // ── xAI (video only) ───────────────────────────────────────────
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_TEXT_API_KEY: z.string().min(1).optional(),
  XAI_VIDEO_API_KEY: z.string().min(1).optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_TEXT_BASE_URL: z.string().url().optional(),
  XAI_VIDEO_BASE_URL: z.string().url().optional(),
  XAI_TEXT_MODEL: z.string().min(1).optional(),
  XAI_VIDEO_MODEL: z.string().min(1).default("grok-imagine-video"),

  // ── OpenRouter (text fallback) ─────────────────────────────────
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_FREE_MODEL: z.string().min(1).default("meta-llama/llama-3.3-70b-instruct:free"),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  OPENROUTER_VIDEO_MODEL: z.string().min(1).default("kwaivgi/kling-video-o1"),
  OPENROUTER_VIDEO_RESOLUTION: z.string().min(1).default("720p"),
  OPENROUTER_VIDEO_ASPECT_RATIO: z.string().min(1).default("16:9"),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_APP_NAME: z.string().min(1).default("HyperMyths"),

  // ── Concentrate AI (text inference) ───────────────────────────
  CONCENTRATE_API_KEY: z.string().min(1).optional(),
  CONCENTRATE_BASE_URL: z.string().url().default("https://api.concentrate.ai/v1"),
  CONCENTRATE_MODEL: z.string().min(1).default("auto"),
  TEXT_INFERENCE_PROVIDER: z
    .enum(["concentrate", "eliza", "huggingface", "godmode", "openrouter", "auto"])
    .default("auto"),

  // ── Video render service ────────────────────────────────────────
  VIDEO_API_KEY: z.string().min(1).optional(),
  VIDEO_API_BASE_URL: z.string().url().optional(),
  VIDEO_RESOLUTION: z.string().min(1).default("720p"),
  VIDEO_ASPECT_RATIO: z.string().min(1).optional(),
  VIDEO_MIN_DURATION_SECONDS: z.coerce.number().int().min(1).default(3),
  VIDEO_MAX_DURATION_SECONDS: z.coerce.number().int().min(1).default(10),
  VIDEO_PROVIDER_PRIORITY: z
    .string()
    .min(1)
    .default("pay_sh,openrouter,eliza,xai,fal,replicate,huggingface"),
  VIDEO_STITCH_SCENE_COUNT: z.coerce.number().int().min(1).max(20).default(3),
  VIDEO_STITCH_EXPERIENCES: z.string().default("mythx,two_act_cinema,funcinema"),

  // Route-specific default durations
  SINGLE_CLIP_DURATION_SECONDS: z.coerce.number().int().min(1).default(4),
  MULTI_SCENE_DURATION_SECONDS: z.coerce.number().int().min(1).default(10),
  DIRECT_RENDER_DURATION_SECONDS: z.coerce.number().int().min(1).default(4),
  MYTHX_DURATION_SECONDS: z.coerce.number().int().min(1).default(10),

  // ── X (Twitter) API — tweet scraping ────────────────────────────
  X_API_BEARER_TOKEN: z.string().min(1).optional(),
  X_API_CONSUMER_KEY: z.string().min(1).optional(),
  X_API_CONSUMER_SECRET: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN: z.string().min(1).optional(),
  X_API_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
  X_API_BASE_URL: z.string().url().default("https://api.x.com/2"),
  X_OAUTH2_CLIENT_ID: z.string().min(1).optional(),
  X_OAUTH2_CLIENT_SECRET: z.string().min(1).optional(),

  // ── Token scanner data providers ──────────────────────────────
  BIRDEYE_API_KEY: z.string().min(1).optional(),
  BIRDEYE_API_BASE_URL: z.string().url().default("https://public-api.birdeye.so"),
  GMGN_API_KEY: z.string().min(1).optional(),
  GMGN_CLI_ENABLED: z.coerce.boolean().default(false),
  HERMES_AGENT_API_URL: z.string().url().optional(),
  HERMES_AGENT_API_KEY: z.string().min(1).optional(),
  XACTIONS_MCP_URL: z.string().url().optional(),

  // ── Pay.sh provider gateway for asset scanner research ───────
  PAY_SH_ENABLED: z.coerce.boolean().default(false),
  PAY_SH_REQUIRE_FOR_VIDEO: z.coerce.boolean().default(true),
  PAY_SH_SANDBOX: z.coerce.boolean().default(true),
  PAY_SH_COMMAND: z.string().min(1).default("pay"),
  PAY_SH_TIMEOUT_MS: z.coerce.number().int().min(1000).default(45000),
  PAY_SH_MAX_CALLS: z.coerce.number().int().min(0).max(12).default(6),
  PAY_SH_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
  PAY_SH_BUFFER_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
  PAY_SH_QUOTE_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  PAY_SH_SOLANA_ENABLED: z.coerce.boolean().default(true),
  PAY_SH_X402_ENABLED: z.coerce.boolean().default(true),
  PAY_SH_TREASURY_ADDRESS: z.string().min(1).optional(),
  PAY_SH_SWEEP_ENABLED: z.coerce.boolean().default(false),
  PAY_SH_SOL_USD_RATE: z.coerce.number().positive().default(150),

  // ── Pump x402 Compute Router — Community compute wallet subsystem ──
  PUMP_COMPUTE_ENABLED: z.coerce.boolean().default(false),
  PUMP_COMPUTE_DEFAULT_SUBSIDY_BPS: z.coerce.number().int().min(0).max(10000).default(0),
  PUMP_COMPUTE_QUOTE_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  PUMP_COMPUTE_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10000).default(0),
  PUMP_COMPUTE_BUFFER_BPS: z.coerce.number().int().min(0).max(10000).default(0),
  PUMP_COMPUTE_TOKEN_USD_TTL_MS: z.coerce.number().int().min(5000).default(30000),

  // ── Helius (Solana wallet history) ─────────────────────────────
  HELIUS_API_KEY: z.string().min(1).optional(),
  SOLANA_RPC_URL: z.string().url().optional(),
  SOLANA_DAS_RPC_URL: z.string().url().optional(),
  SOLANA_MINT_PAYMENT_ADDRESS: z.string().min(1).optional(),
  SOLANA_MINT_BUNDLE_PRICE_SOL: z.coerce.number().positive().default(0.01),
  SOLANA_MINT_AUTHORITY_SECRET: z.string().min(1).optional(),
  CNFT_MERKLE_TREE_ADDRESS: z.string().min(1).optional(),
  CNFT_COLLECTION_ADDRESS: z.string().min(1).optional(),
  ARWEAVE_WALLET_JWK: z.string().min(1).optional(),
  ARWEAVE_GATEWAY_URL: z.string().url().default("https://arweave.net"),
  IRYS_PRIVATE_KEY: z.string().min(1).optional(),
  IRYS_NETWORK: z.string().min(1).default("mainnet"),
  IRYS_PROVIDER_URL: z.string().url().optional(),
  IRYS_GATEWAY_URL: z.string().url().default("https://gateway.irys.xyz"),

  // ── S3 storage (Supabase) ──────────────────────────────────────
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).default("videos"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_PUBLIC_URL: z.string().url().optional(),

  // ── Worker / job processing ─────────────────────────────────────
  WORKER_BACKEND: z.enum(["auto", "cloudflare", "railway", "local"]).default("auto"),
  WORKER_URL: z.string().url().optional(),
  WORKER_TOKEN: z.string().optional(),
  ALLOW_IN_PROCESS_WORKER: z.coerce.boolean().optional(),
  LIMITS_MODE: z.enum(["on", "off"]).default("on"),
  ANALYTICS_ENGINE_MODE: z
    .enum(["auto", "v2", "legacy", "v2-only", "legacy-only"])
    .default("auto"),
  JOB_PROCESSING_STALE_MS: z.coerce.number().int().min(60_000).default(900_000),

  // ── Video polling ───────────────────────────────────────────────
  VIDEO_RENDER_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
  VIDEO_RENDER_MAX_POLL_ATTEMPTS: z.coerce.number().int().min(1).default(120),

  // ── App / admin ─────────────────────────────────────────────────
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  COCKPIT_USERNAME: z.string().min(1).optional(),
  COCKPIT_PASSWORD: z.string().min(1).optional(),
  ADMIN_SECRET: z.string().min(1).optional(),
  AUTONOMOUS_CHAT_TOKEN: z.string().min(1).optional(),
  TRUST_PROXY_IP_HEADERS: z.coerce.boolean().optional(),
  MOLTBOOK_API_BASE_URL: z.string().url().optional(),
  MOLTBOOK_AGENT_API_KEY: z.string().min(1).optional(),
  PRIVY_APP_ID: z.string().min(1).optional(),
  PRIVY_APP_SECRET: z.string().min(1).optional(),
  PRIVY_JWT_VERIFICATION_KEY: z.string().min(1).optional(),
  CSP_REPORT_ONLY: z.coerce.boolean().optional(),
  CSP_ENFORCE: z.coerce.boolean().optional(),
  CSP_REPORT_URI: z.string().url().optional(),

  // ── Database (not validated here — handled by Prisma) ──────────
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const elizaApiKey =
    trimOptionalEnvValue(process.env.ELIZA_API_KEY) ??
    trimOptionalEnvValue(process.env.ELIZA_CLOUD_API_KEY);
  const elizaBaseUrl =
    trimEnvValue(process.env.ELIZA_BASE_URL) ??
    trimEnvValue(process.env.ELIZA_API_BASE_URL);
  const elizaVideoBaseUrl =
    trimEnvValue(process.env.ELIZA_VIDEO_BASE_URL) ??
    trimEnvValue(process.env.ELIZA_VIDEO_API_BASE_URL);

  const parsed = envSchema.safeParse({
    ...process.env,
    // ElizaOS
    ELIZA_API_KEY: elizaApiKey,
    ELIZA_CLOUD_API_KEY: trimOptionalEnvValue(process.env.ELIZA_CLOUD_API_KEY),
    ELIZA_BASE_URL: elizaBaseUrl,
    ELIZA_API_BASE_URL: trimEnvValue(process.env.ELIZA_API_BASE_URL),
    ELIZA_MODEL: trimOptionalEnvValue(process.env.ELIZA_MODEL),
    ELIZA_VIDEO_API_KEY: trimOptionalEnvValue(process.env.ELIZA_VIDEO_API_KEY),
    ELIZA_VIDEO_BASE_URL: elizaVideoBaseUrl,
    ELIZA_VIDEO_API_BASE_URL: trimEnvValue(
      process.env.ELIZA_VIDEO_API_BASE_URL,
    ),
    ELIZA_VIDEO_MODEL: trimOptionalEnvValue(process.env.ELIZA_VIDEO_MODEL),
    ELIZA_VIDEO_RESOLUTION: trimOptionalEnvValue(
      process.env.ELIZA_VIDEO_RESOLUTION,
    ),
    ELIZA_VIDEO_SIZE: trimOptionalEnvValue(process.env.ELIZA_VIDEO_SIZE),
    ELIZA_VIDEO_ASPECT_RATIO: trimOptionalEnvValue(
      process.env.ELIZA_VIDEO_ASPECT_RATIO,
    ),
    ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK: trimOptionalEnvValue(
      process.env.ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK,
    ),
    // HuggingFace
    HUGGINGFACE_API_KEY: trimOptionalEnvValue(process.env.HUGGINGFACE_API_KEY),
    HUGGINGFACE_BASE_URL: trimEnvValue(process.env.HUGGINGFACE_BASE_URL),
    HUGGINGFACE_MODEL: trimOptionalEnvValue(process.env.HUGGINGFACE_MODEL),
    HF_VIDEO_MODEL: trimOptionalEnvValue(process.env.HF_VIDEO_MODEL),
    HF_VIDEO_INFERENCE_PROVIDER: trimOptionalEnvValue(process.env.HF_VIDEO_INFERENCE_PROVIDER),
    HF_VIDEO_MAX_WAIT_MS: trimOptionalEnvValue(process.env.HF_VIDEO_MAX_WAIT_MS),
    // Fal.ai
    FAL_API_KEY: trimOptionalEnvValue(process.env.FAL_API_KEY),
    FAL_BASE_URL: trimEnvValue(process.env.FAL_BASE_URL),
    FAL_MODEL: trimOptionalEnvValue(process.env.FAL_MODEL),
    // Replicate
    REPLICATE_API_KEY: trimOptionalEnvValue(process.env.REPLICATE_API_KEY),
    REPLICATE_MODEL: trimOptionalEnvValue(process.env.REPLICATE_MODEL),
    // Vast.ai
    VAST_API_KEY: trimOptionalEnvValue(process.env.VAST_API_KEY),
    VAST_BASE_URL: trimEnvValue(process.env.VAST_BASE_URL),
    VAST_MODEL: trimOptionalEnvValue(process.env.VAST_MODEL),
    // G0DM0D3
    GODMODE_API_BASE_URL: trimEnvValue(process.env.GODMODE_API_BASE_URL),
    GODMODE_API_KEY: trimOptionalEnvValue(process.env.GODMODE_API_KEY),
    GODMODE_MODEL: trimOptionalEnvValue(process.env.GODMODE_MODEL),
    XAI_API_KEY: trimOptionalEnvValue(process.env.XAI_API_KEY),
    XAI_TEXT_API_KEY: trimOptionalEnvValue(process.env.XAI_TEXT_API_KEY),
    XAI_VIDEO_API_KEY: trimOptionalEnvValue(process.env.XAI_VIDEO_API_KEY),
    XAI_BASE_URL: trimEnvValue(process.env.XAI_BASE_URL),
    XAI_TEXT_BASE_URL: trimOptionalEnvValue(process.env.XAI_TEXT_BASE_URL),
    XAI_VIDEO_BASE_URL: trimOptionalEnvValue(process.env.XAI_VIDEO_BASE_URL),
    XAI_TEXT_MODEL: trimOptionalEnvValue(process.env.XAI_TEXT_MODEL),
    XAI_VIDEO_MODEL: trimOptionalEnvValue(process.env.XAI_VIDEO_MODEL),
    OPENROUTER_API_KEY: trimOptionalEnvValue(process.env.OPENROUTER_API_KEY),
    OPENROUTER_BASE_URL: trimEnvValue(process.env.OPENROUTER_BASE_URL),
    OPENROUTER_FREE_MODEL: trimOptionalEnvValue(process.env.OPENROUTER_FREE_MODEL),
    OPENROUTER_MODEL: trimOptionalEnvValue(process.env.OPENROUTER_MODEL),
    OPENROUTER_VIDEO_MODEL: trimOptionalEnvValue(process.env.OPENROUTER_VIDEO_MODEL),
    OPENROUTER_VIDEO_RESOLUTION: trimOptionalEnvValue(process.env.OPENROUTER_VIDEO_RESOLUTION),
    OPENROUTER_VIDEO_ASPECT_RATIO: trimOptionalEnvValue(process.env.OPENROUTER_VIDEO_ASPECT_RATIO),
    OPENROUTER_SITE_URL: trimOptionalEnvValue(process.env.OPENROUTER_SITE_URL),
    OPENROUTER_APP_NAME: trimOptionalEnvValue(process.env.OPENROUTER_APP_NAME),
    CONCENTRATE_API_KEY: trimOptionalEnvValue(process.env.CONCENTRATE_API_KEY),
    CONCENTRATE_BASE_URL: trimEnvValue(process.env.CONCENTRATE_BASE_URL),
    CONCENTRATE_MODEL: trimOptionalEnvValue(process.env.CONCENTRATE_MODEL),
    TEXT_INFERENCE_PROVIDER:
      trimOptionalEnvValue(process.env.TEXT_INFERENCE_PROVIDER)?.toLowerCase() ??
      undefined,
    VIDEO_API_KEY: trimOptionalEnvValue(process.env.VIDEO_API_KEY),
    VIDEO_API_BASE_URL: trimOptionalEnvValue(process.env.VIDEO_API_BASE_URL),
    VIDEO_RESOLUTION: trimOptionalEnvValue(process.env.VIDEO_RESOLUTION),
    VIDEO_ASPECT_RATIO: trimOptionalEnvValue(process.env.VIDEO_ASPECT_RATIO),
    VIDEO_PROVIDER_PRIORITY: trimOptionalEnvValue(
      process.env.VIDEO_PROVIDER_PRIORITY,
    ),
    VIDEO_STITCH_SCENE_COUNT: trimOptionalEnvValue(
      process.env.VIDEO_STITCH_SCENE_COUNT,
    ),
    VIDEO_STITCH_EXPERIENCES: trimOptionalEnvValue(
      process.env.VIDEO_STITCH_EXPERIENCES,
    ),
    X_API_BEARER_TOKEN: trimOptionalEnvValue(process.env.X_API_BEARER_TOKEN),
    X_API_CONSUMER_KEY: trimOptionalEnvValue(process.env.X_API_CONSUMER_KEY),
    X_API_CONSUMER_SECRET: trimOptionalEnvValue(
      process.env.X_API_CONSUMER_SECRET,
    ),
    X_API_ACCESS_TOKEN: trimOptionalEnvValue(process.env.X_API_ACCESS_TOKEN),
    X_API_ACCESS_TOKEN_SECRET: trimOptionalEnvValue(
      process.env.X_API_ACCESS_TOKEN_SECRET,
    ),
    X_API_BASE_URL: trimEnvValue(process.env.X_API_BASE_URL),
    X_OAUTH2_CLIENT_ID: trimOptionalEnvValue(process.env.X_OAUTH2_CLIENT_ID),
    X_OAUTH2_CLIENT_SECRET: trimOptionalEnvValue(
      process.env.X_OAUTH2_CLIENT_SECRET,
    ),
    BIRDEYE_API_KEY: trimOptionalEnvValue(process.env.BIRDEYE_API_KEY),
    BIRDEYE_API_BASE_URL: trimEnvValue(process.env.BIRDEYE_API_BASE_URL),
    GMGN_API_KEY: trimOptionalEnvValue(process.env.GMGN_API_KEY),
    GMGN_CLI_ENABLED: trimOptionalEnvValue(process.env.GMGN_CLI_ENABLED),
    HERMES_AGENT_API_URL: trimOptionalEnvValue(process.env.HERMES_AGENT_API_URL),
    HERMES_AGENT_API_KEY: trimOptionalEnvValue(process.env.HERMES_AGENT_API_KEY),
    XACTIONS_MCP_URL: trimOptionalEnvValue(process.env.XACTIONS_MCP_URL),
    PAY_SH_ENABLED: trimOptionalEnvValue(process.env.PAY_SH_ENABLED),
    PAY_SH_REQUIRE_FOR_VIDEO: trimOptionalEnvValue(process.env.PAY_SH_REQUIRE_FOR_VIDEO),
    PAY_SH_SANDBOX: trimOptionalEnvValue(process.env.PAY_SH_SANDBOX),
    PAY_SH_COMMAND: trimOptionalEnvValue(process.env.PAY_SH_COMMAND),
    PAY_SH_TIMEOUT_MS: trimOptionalEnvValue(process.env.PAY_SH_TIMEOUT_MS),
    PAY_SH_MAX_CALLS: trimOptionalEnvValue(process.env.PAY_SH_MAX_CALLS),
    PAY_SH_PLATFORM_FEE_BPS: trimOptionalEnvValue(process.env.PAY_SH_PLATFORM_FEE_BPS),
    PAY_SH_BUFFER_BPS: trimOptionalEnvValue(process.env.PAY_SH_BUFFER_BPS),
    PAY_SH_QUOTE_TTL_SECONDS: trimOptionalEnvValue(process.env.PAY_SH_QUOTE_TTL_SECONDS),
    PAY_SH_SOLANA_ENABLED: trimOptionalEnvValue(process.env.PAY_SH_SOLANA_ENABLED),
    PAY_SH_X402_ENABLED: trimOptionalEnvValue(process.env.PAY_SH_X402_ENABLED),
    PAY_SH_TREASURY_ADDRESS: trimOptionalEnvValue(process.env.PAY_SH_TREASURY_ADDRESS),
    PAY_SH_SWEEP_ENABLED: trimOptionalEnvValue(process.env.PAY_SH_SWEEP_ENABLED),
    PAY_SH_SOL_USD_RATE: trimOptionalEnvValue(process.env.PAY_SH_SOL_USD_RATE),
    PUMP_COMPUTE_ENABLED: trimOptionalEnvValue(process.env.PUMP_COMPUTE_ENABLED),
    PUMP_COMPUTE_DEFAULT_SUBSIDY_BPS: trimOptionalEnvValue(process.env.PUMP_COMPUTE_DEFAULT_SUBSIDY_BPS),
    PUMP_COMPUTE_QUOTE_TTL_SECONDS: trimOptionalEnvValue(process.env.PUMP_COMPUTE_QUOTE_TTL_SECONDS),
    PUMP_COMPUTE_PLATFORM_FEE_BPS: trimOptionalEnvValue(process.env.PUMP_COMPUTE_PLATFORM_FEE_BPS),
    PUMP_COMPUTE_BUFFER_BPS: trimOptionalEnvValue(process.env.PUMP_COMPUTE_BUFFER_BPS),
    PUMP_COMPUTE_TOKEN_USD_TTL_MS: trimOptionalEnvValue(process.env.PUMP_COMPUTE_TOKEN_USD_TTL_MS),
    HELIUS_API_KEY: trimOptionalEnvValue(process.env.HELIUS_API_KEY),
    SOLANA_RPC_URL: trimOptionalEnvValue(process.env.SOLANA_RPC_URL),
    SOLANA_DAS_RPC_URL: trimOptionalEnvValue(process.env.SOLANA_DAS_RPC_URL),
    SOLANA_MINT_PAYMENT_ADDRESS: trimOptionalEnvValue(
      process.env.SOLANA_MINT_PAYMENT_ADDRESS,
    ),
    SOLANA_MINT_BUNDLE_PRICE_SOL: trimOptionalEnvValue(
      process.env.SOLANA_MINT_BUNDLE_PRICE_SOL,
    ),
    SOLANA_MINT_AUTHORITY_SECRET: trimOptionalEnvValue(
      process.env.SOLANA_MINT_AUTHORITY_SECRET,
    ),
    CNFT_MERKLE_TREE_ADDRESS: trimOptionalEnvValue(
      process.env.CNFT_MERKLE_TREE_ADDRESS,
    ),
    CNFT_COLLECTION_ADDRESS: trimOptionalEnvValue(
      process.env.CNFT_COLLECTION_ADDRESS,
    ),
    ARWEAVE_WALLET_JWK: trimOptionalEnvValue(process.env.ARWEAVE_WALLET_JWK),
    ARWEAVE_GATEWAY_URL: trimOptionalEnvValue(process.env.ARWEAVE_GATEWAY_URL),
    IRYS_PRIVATE_KEY: trimOptionalEnvValue(process.env.IRYS_PRIVATE_KEY),
    IRYS_NETWORK: trimOptionalEnvValue(process.env.IRYS_NETWORK),
    IRYS_PROVIDER_URL: trimOptionalEnvValue(process.env.IRYS_PROVIDER_URL),
    IRYS_GATEWAY_URL: trimOptionalEnvValue(process.env.IRYS_GATEWAY_URL),
    S3_ENDPOINT: trimOptionalEnvValue(process.env.S3_ENDPOINT),
    S3_ACCESS_KEY_ID: trimOptionalEnvValue(process.env.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: trimOptionalEnvValue(
      process.env.S3_SECRET_ACCESS_KEY,
    ),
    S3_BUCKET: trimOptionalEnvValue(process.env.S3_BUCKET),
    S3_REGION: trimOptionalEnvValue(process.env.S3_REGION),
    S3_PUBLIC_URL: trimOptionalEnvValue(process.env.S3_PUBLIC_URL),
    WORKER_BACKEND:
      trimOptionalEnvValue(process.env.WORKER_BACKEND)?.toLowerCase() ??
      undefined,
    WORKER_URL: trimOptionalEnvValue(process.env.WORKER_URL),
    WORKER_TOKEN: trimOptionalEnvValue(process.env.WORKER_TOKEN),
    LIMITS_MODE:
      trimOptionalEnvValue(process.env.LIMITS_MODE)?.toLowerCase() ?? undefined,
    ANALYTICS_ENGINE_MODE: trimOptionalEnvValue(
      process.env.ANALYTICS_ENGINE_MODE,
    ),
    JOB_PROCESSING_STALE_MS: trimOptionalEnvValue(
      process.env.JOB_PROCESSING_STALE_MS,
    ),
    APP_BASE_URL: trimEnvValue(process.env.APP_BASE_URL),
    COCKPIT_USERNAME: trimOptionalEnvValue(process.env.COCKPIT_USERNAME),
    COCKPIT_PASSWORD: trimOptionalEnvValue(process.env.COCKPIT_PASSWORD),
    ADMIN_SECRET: trimOptionalEnvValue(process.env.ADMIN_SECRET),
    AUTONOMOUS_CHAT_TOKEN: trimOptionalEnvValue(
      process.env.AUTONOMOUS_CHAT_TOKEN,
    ),
    TRUST_PROXY_IP_HEADERS: trimOptionalEnvValue(
      process.env.TRUST_PROXY_IP_HEADERS,
    ),
    PRIVY_APP_ID:
      trimOptionalEnvValue(process.env.PRIVY_APP_ID) ??
      trimOptionalEnvValue(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    PRIVY_APP_SECRET: trimOptionalEnvValue(process.env.PRIVY_APP_SECRET),
    PRIVY_JWT_VERIFICATION_KEY: trimOptionalEnvValue(
      process.env.PRIVY_JWT_VERIFICATION_KEY,
    ),
    CSP_REPORT_ONLY: trimOptionalEnvValue(process.env.CSP_REPORT_ONLY),
    CSP_ENFORCE: trimOptionalEnvValue(process.env.CSP_ENFORCE),
    CSP_REPORT_URI: trimOptionalEnvValue(process.env.CSP_REPORT_URI),
    MOLTBOOK_API_BASE_URL: trimOptionalEnvValue(
      process.env.MOLTBOOK_API_BASE_URL,
    ),
    MOLTBOOK_AGENT_API_KEY: trimOptionalEnvValue(
      process.env.MOLTBOOK_AGENT_API_KEY,
    ),
    VIDEO_RENDER_POLL_INTERVAL_MS: trimOptionalEnvValue(
      process.env.VIDEO_RENDER_POLL_INTERVAL_MS,
    ),
    VIDEO_RENDER_MAX_POLL_ATTEMPTS: trimOptionalEnvValue(
      process.env.VIDEO_RENDER_MAX_POLL_ATTEMPTS,
    ),
    NODE_ENV: trimOptionalEnvValue(process.env.NODE_ENV),
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Bad env config: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
