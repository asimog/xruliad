import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_ENV_GROUPS = {
  appCore: ["DATABASE_URL", "WORKER_TOKEN", "VIDEO_API_KEY", "VIDEO_API_BASE_URL"],
  ai: [],
  storage: ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  admin: ["ADMIN_SECRET"],
  videoService: ["DATABASE_URL", "VIDEO_API_KEY", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  workerService: ["WORKER_TOKEN"],
  paySh: ["PAY_SH_COMMAND"],
};

const PAY_SH_ENV_KEYS = [
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

const MASTER_ENV_KEYS = [
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
  "FAL_API_KEY",
  "FAL_BASE_URL",
  "FAL_MODEL",
  "REPLICATE_API_KEY",
  "REPLICATE_MODEL",
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
  "WORKER_TOKEN",
  "WORKER_BACKEND",
  "WORKER_URL",
  "WORKER_ALLOW_UNAUTHENTICATED",
  "WORKER_MAX_BODY_BYTES",
  "WORKER_POLL_INTERVAL_MS",
  "WORKER_CONCURRENCY",
  "VIDEO_API_KEY",
  "VIDEO_API_BASE_URL",
  "VIDEO_SERVICE_BASE_URL",
  "VIDEO_RESOLUTION",
  "VIDEO_PROVIDER_PRIORITY",
  "TEXT_INFERENCE_PROVIDER",
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
  "PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
  "PRIVY_JWT_VERIFICATION_KEY",
  "NEXT_PUBLIC_PRIVY_APP_ID",
  "NEXT_PUBLIC_PRIVY_CLIENT_ID",
  "NEXT_PUBLIC_PRIVY_LOGIN_METHODS",
  "NEXT_PUBLIC_PRIVY_LOGIN_MESSAGE",
  "NEXT_PUBLIC_PRIVY_THEME",
  "NEXT_PUBLIC_PRIVY_ACCENT_COLOR",
  "NEXT_PUBLIC_PRIVY_SHOW_WALLET_LOGIN_FIRST",
  "NEXT_PUBLIC_PRIVY_WALLET_CHAIN_TYPE",
  "NEXT_PUBLIC_PRIVY_PRIMARY_DOMAIN",
  "NEXT_PUBLIC_PRIVY_ALLOWED_REDIRECT_URLS",
  "NEXT_PUBLIC_PRIVATE_STUDIO_PAYMENT_ADDRESS",
  "NEXT_PUBLIC_PRIVATE_STUDIO_PAYMENT_AMOUNT_SOL",
  "NEXT_PUBLIC_PRIVATE_STUDIO_PAYMENT_NOTE",
  "CSP_REPORT_ONLY",
  "CSP_ENFORCE",
  "CSP_REPORT_URI",
  "MOLTBOOK_API_BASE_URL",
  "MOLTBOOK_AGENT_API_KEY",
  "HELIUS_API_KEY",
  "HERMES_AGENT_API_URL",
  "HERMES_AGENT_API_KEY",
  "XACTIONS_MCP_URL",
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
  ...PAY_SH_ENV_KEYS,
];

const PLACEHOLDER_PATTERNS = [
  /^changeme$/i,
  /^change-me$/i,
  /^your[-_]/i,
  /^example$/i,
  /^placeholder$/i,
  /^replace[-_]/i,
];

function parseDotEnv(content) {
  const output = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    output[key] = value;
  }
  return output;
}

function isMissingOrPlaceholder(value) {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function main() {
  const envPath = process.argv[2] ?? ".env.local";
  const absolutePath = resolve(process.cwd(), envPath);
  const raw = readFileSync(absolutePath, "utf8");
  const parsed = parseDotEnv(raw);

  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }

  const payShConfigured = parsed.PAY_SH_ENABLED === "true";
  const missingFromFile = MASTER_ENV_KEYS.filter((key) => {
    if (PAY_SH_ENV_KEYS.includes(key) && !payShConfigured) return false;
    return !(key in parsed);
  });
  if (missingFromFile.length > 0) {
    throw new Error(
      `[env:file] Missing keys in ${envPath}: ${missingFromFile.join(", ")}`,
    );
  }

  const groups = [
    "appCore",
    "ai",
    "storage",
    "supabase",
    "admin",
    "videoService",
    "workerService",
  ];
  const requiredKeys = new Set();
  for (const group of groups) {
    for (const key of REQUIRED_ENV_GROUPS[group]) {
      requiredKeys.add(key);
    }
  }

  const missingRequired = Array.from(requiredKeys).filter((key) =>
    isMissingOrPlaceholder(process.env[key]),
  );

  const hasAnyVideoProvider =
    !isMissingOrPlaceholder(process.env.ELIZA_VIDEO_API_KEY) ||
    !isMissingOrPlaceholder(process.env.ELIZA_API_KEY) ||
    !isMissingOrPlaceholder(process.env.ELIZA_CLOUD_API_KEY) ||
    !isMissingOrPlaceholder(process.env.OPENROUTER_API_KEY) ||
    !isMissingOrPlaceholder(process.env.FAL_API_KEY) ||
    !isMissingOrPlaceholder(process.env.REPLICATE_API_KEY) ||
    !isMissingOrPlaceholder(process.env.XAI_API_KEY) ||
    !isMissingOrPlaceholder(process.env.XAI_VIDEO_API_KEY);

  const hasAnyTextProvider =
    !isMissingOrPlaceholder(process.env.OPENROUTER_API_KEY) ||
    !isMissingOrPlaceholder(process.env.ELIZA_API_KEY) ||
    !isMissingOrPlaceholder(process.env.ELIZA_CLOUD_API_KEY) ||
    !isMissingOrPlaceholder(process.env.ELIZA_VIDEO_API_KEY) ||
    !isMissingOrPlaceholder(process.env.HUGGINGFACE_API_KEY) ||
    (!isMissingOrPlaceholder(process.env.GODMODE_API_BASE_URL) &&
      !isMissingOrPlaceholder(process.env.GODMODE_API_KEY));

  if (!hasAnyTextProvider) {
    missingRequired.push(
      "At least one text provider key (OPENROUTER_API_KEY/ELIZA_API_KEY/HUGGINGFACE_API_KEY/GODMODE_API_KEY)",
    );
  }

  if (!hasAnyVideoProvider) {
    missingRequired.push(
      "At least one video provider key (ELIZA_API_KEY/ELIZA_VIDEO_API_KEY/OPENROUTER_API_KEY/FAL_API_KEY/REPLICATE_API_KEY/XAI_API_KEY)",
    );
  }

  if (process.env.PAY_SH_ENABLED === "true") {
    for (const key of REQUIRED_ENV_GROUPS.paySh) {
      if (isMissingOrPlaceholder(process.env[key])) {
        missingRequired.push(key);
      }
    }

    if (process.env.PAY_SH_SOLANA_ENABLED !== "false") {
      for (const key of ["SOLANA_RPC_URL", "SOLANA_MINT_AUTHORITY_SECRET"]) {
        if (isMissingOrPlaceholder(process.env[key])) {
          missingRequired.push(key);
        }
      }
    }
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `[env:required] Missing required values: ${missingRequired.join(", ")}`,
    );
  }

  console.log(
    `Environment validation passed for ${envPath}. Checked ${MASTER_ENV_KEYS.length} vars.`,
  );
}

main();
