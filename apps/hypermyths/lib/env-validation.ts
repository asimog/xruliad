const REQUIRED_ENV_GROUPS = {
  appCore: ["DATABASE_URL", "WORKER_TOKEN", "VIDEO_API_KEY", "VIDEO_API_BASE_URL"],
  ai: [],
  storage: ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  admin: ["ADMIN_SECRET"],
  videoService: ["DATABASE_URL", "VIDEO_API_KEY", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  workerService: ["WORKER_TOKEN"],
  privy: ["NEXT_PUBLIC_PRIVY_APP_ID", "PRIVY_APP_SECRET", "PRIVY_JWT_VERIFICATION_KEY"],
  paySh: ["PAY_SH_COMMAND", "SOLANA_RPC_URL", "SOLANA_MINT_AUTHORITY_SECRET"],
} as const;

type EnvGroup = keyof typeof REQUIRED_ENV_GROUPS;

const PLACEHOLDER_PATTERNS = [
  /^changeme$/i,
  /^change-me$/i,
  /^your[-_]/i,
  /^example$/i,
  /^placeholder$/i,
  /^replace[-_]/i,
];

function isMissingOrPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function validateRequiredEnvGroups(groups: EnvGroup[]): {
  missing: string[];
} {
  const uniqueKeys = new Set<string>();
  for (const group of groups) {
    for (const key of REQUIRED_ENV_GROUPS[group]) {
      uniqueKeys.add(key);
    }
  }

  const missing = Array.from(uniqueKeys).filter((key) =>
    isMissingOrPlaceholder(process.env[key]),
  );
  return { missing };
}

export function assertRequiredEnvGroups(
  groups: EnvGroup[],
  context: string,
): void {
  const { missing } = validateRequiredEnvGroups(groups);
  if (missing.length === 0) {
    return;
  }
  throw new Error(
    `[env:${context}] Missing required env vars: ${missing.join(", ")}`,
  );
}

export function getMasterEnvVarList(): string[] {
  return [
    "NODE_ENV",
    "APP_BASE_URL",
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_MUSIC_PLAYLIST_BASE_URL",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET",
    "S3_REGION",
    "S3_PUBLIC_URL",
    "GODMODE_API_BASE_URL",
    "GODMODE_API_KEY",
    "GODMODE_MODEL",
    "ELIZA_API_KEY",
    "ELIZA_CLOUD_API_KEY",
    "ELIZA_BASE_URL",
    "ELIZA_MODEL",
    "ELIZA_VIDEO_API_KEY",
    "ELIZA_VIDEO_BASE_URL",
    "ELIZA_VIDEO_MODEL",
    "ELIZA_VIDEO_RESOLUTION",
    "ELIZA_VIDEO_SIZE",
    "ELIZA_VIDEO_ASPECT_RATIO",
    "ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK",
    "XAI_API_KEY",
    "XAI_TEXT_API_KEY",
    "XAI_VIDEO_API_KEY",
    "XAI_BASE_URL",
    "XAI_TEXT_BASE_URL",
    "XAI_VIDEO_BASE_URL",
    "XAI_TEXT_MODEL",
    "XAI_VIDEO_MODEL",
    "OPENROUTER_API_KEY",
    "OPENROUTER_BASE_URL",
    "OPENROUTER_FREE_MODEL",
    "OPENROUTER_MODEL",
    "OPENROUTER_VIDEO_MODEL",
    "OPENROUTER_VIDEO_RESOLUTION",
    "OPENROUTER_VIDEO_ASPECT_RATIO",
    "OPENROUTER_SITE_URL",
    "OPENROUTER_APP_NAME",
    "X_API_BEARER_TOKEN",
    "X_API_CONSUMER_KEY",
    "X_API_CONSUMER_SECRET",
    "X_API_ACCESS_TOKEN",
    "X_API_ACCESS_TOKEN_SECRET",
    "X_API_BASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "TEXT_INFERENCE_PROVIDER",
    "WORKER_BACKEND",
    "WORKER_TOKEN",
    "WORKER_URL",
    "WORKER_ALLOW_UNAUTHENTICATED",
    "WORKER_MAX_BODY_BYTES",
    "WORKER_POLL_INTERVAL_MS",
    "WORKER_CONCURRENCY",
    "VIDEO_API_KEY",
    "VIDEO_API_BASE_URL",
    "VIDEO_SERVICE_BASE_URL",
    "VIDEO_RESOLUTION",
    "VIDEO_RENDER_POLL_INTERVAL_MS",
    "VIDEO_RENDER_MAX_POLL_ATTEMPTS",
    "PORT",
    "FFMPEG_PATH",
    "MAX_CLIP_SECONDS",
    "XAI_POLL_INTERVAL_MS",
    "XAI_MAX_POLL_ATTEMPTS",
    "RENDER_RECOVERY_INTERVAL_MS",
    "RENDER_STALE_MS",
    "RENDER_RECOVERY_BATCH_LIMIT",
    "ANALYTICS_ENGINE_MODE",
    "JOB_PROCESSING_STALE_MS",
    "ADMIN_SECRET",
    "AUTONOMOUS_CHAT_TOKEN",
    "TRUST_PROXY_IP_HEADERS",
    "MOLTBOOK_API_BASE_URL",
    "MOLTBOOK_AGENT_API_KEY",
    "HELIUS_API_KEY",
    "HELIUS_WEBHOOK_ID",
    "RUN_LIVE_E2E",
    "SOLANA_RPC_URL",
    "SOLANA_RPC_FALLBACK_URL",
    "SOLANA_DAS_RPC_URL",
    "SOLANA_MINT_PAYMENT_ADDRESS",
    "SOLANA_MINT_BUNDLE_PRICE_SOL",
    "SOLANA_MINT_AUTHORITY_SECRET",
    "CNFT_MERKLE_TREE_ADDRESS",
    "CNFT_COLLECTION_ADDRESS",
    "ARWEAVE_WALLET_JWK",
    "ARWEAVE_GATEWAY_URL",
    "IRYS_PRIVATE_KEY",
    "IRYS_NETWORK",
    "IRYS_PROVIDER_URL",
    "IRYS_GATEWAY_URL",
    "LIVE_TEST_MINT",
    "PAY_SH_ENABLED",
    "PAY_SH_REQUIRE_FOR_VIDEO",
    "PAY_SH_SANDBOX",
    "PAY_SH_COMMAND",
    "PAY_SH_TIMEOUT_MS",
    "PAY_SH_MAX_CALLS",
    "PAY_SH_PLATFORM_FEE_BPS",
    "PAY_SH_BUFFER_BPS",
    "PAY_SH_QUOTE_TTL_SECONDS",
    "PAY_SH_SOLANA_ENABLED",
    "PAY_SH_X402_ENABLED",
    "PAY_SH_TREASURY_ADDRESS",
    "PAY_SH_SWEEP_ENABLED",
    "PAY_SH_SOL_USD_RATE",
  ];
}
