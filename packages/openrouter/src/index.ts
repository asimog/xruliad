export type OpenRouterKeyMode = "browser_local" | "ephemeral_server" | "encrypted_cloud";
export type OpenRouterKeyTestResult = { valid: boolean; message: string; modelsAvailable?: number };
export type OpenRouterModelChoice = { id: string; name: string; pricing: { prompt: string; completion: string }; contextLength: number };
export type OpenRouterQuote = { model: string; estimatedCost: string; provider: string };
export type OpenRouterSpendPolicy = { maxRequestCost: number; dailySpendLimit: number; allowFree: boolean; allowPaid: boolean };

export function readOpenRouterConfig(env: NodeJS.ProcessEnv = process.env) {
  const key = env.OPENROUTER_API_KEY ?? "";
  return {
    configured: Boolean(key),
    baseUrl: env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    allowFree: (env.OPENROUTER_ALLOW_FREE ?? "true") === "true",
    allowPaid: (env.OPENROUTER_ALLOW_PAID ?? "true") === "true",
    defaultModel: env.OPENROUTER_DEFAULT_MODEL ?? undefined,
    freeModel: env.OPENROUTER_FREE_MODEL ?? "deepseek/deepseek-v4-pro",
    maxRequestCost: Number(env.OPENROUTER_MAX_REQUEST_COST ?? 0.1),
    dailySpendLimit: Number(env.OPENROUTER_DAILY_SPEND_LIMIT ?? 5)
  };
}

export function testOpenRouterKey(key?: string): OpenRouterKeyTestResult {
  if (!key || key.length < 10) return { valid: false, message: "Key missing or too short" };
  if (!key.startsWith("sk-or-")) return { valid: false, message: "Key does not look like an OpenRouter key (should start with sk-or-)" };
  return { valid: true, message: "Key format looks valid. Live validation requires API call.", modelsAvailable: undefined };
}

export function redactOpenRouterKey(key: string): string {
  if (!key) return "[no key]";
  if (key.length <= 10) return "***";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

export function assertOpenRouterKeyNotLogged(key: string): void {
  if (process.env.NODE_ENV === "development" && key) {
    console.warn("[openrouter] Key present but will not be logged.");
  }
}

export function chooseOpenRouterModel(config: ReturnType<typeof readOpenRouterConfig>): OpenRouterQuote {
  if (config.defaultModel) return { model: config.defaultModel, estimatedCost: "$0.00 (default)", provider: "openrouter" };
  if (config.allowFree) return { model: config.freeModel, estimatedCost: "$0.00 (free)", provider: "openrouter" };
  return { model: "openrouter/auto", estimatedCost: "$0.0005/1K tokens (auto)", provider: "openrouter" };
}

export function readSpendPolicy(env: NodeJS.ProcessEnv = process.env): OpenRouterSpendPolicy {
  return {
    maxRequestCost: Number(env.OPENROUTER_MAX_REQUEST_COST ?? 1),
    dailySpendLimit: Number(env.OPENROUTER_DAILY_SPEND_LIMIT ?? 25),
    allowFree: (env.OPENROUTER_ALLOW_FREE ?? "true") === "true",
    allowPaid: (env.OPENROUTER_ALLOW_PAID ?? "true") === "true"
  };
}

export function checkSpendPolicy(cost: number, policy: OpenRouterSpendPolicy): { allowed: boolean; reason: string } {
  if (cost > policy.maxRequestCost) return { allowed: false, reason: `Cost $${cost.toFixed(4)} exceeds max request cost $${policy.maxRequestCost}` };
  if (cost === 0 && !policy.allowFree) return { allowed: false, reason: "Free models disabled" };
  if (cost > 0 && !policy.allowPaid) return { allowed: false, reason: "Paid models disabled" };
  return { allowed: true, reason: "Within spend policy" };
}
