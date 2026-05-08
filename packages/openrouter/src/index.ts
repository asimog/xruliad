export type OpenRouterKeyMode = "browser_local" | "ephemeral_server" | "encrypted_cloud";
export type OpenRouterKeyTestResult = { valid: boolean; message: string; modelsAvailable?: number };
export type OpenRouterModelChoice = { id: string; name: string; pricing: { prompt: string; completion: string }; contextLength: number };
export type OpenRouterQuote = { model: string; estimatedCost: string; provider: string };
export type OpenRouterSpendPolicy = { maxRequestCost: number; dailySpendLimit: number; allowFree: boolean; allowPaid: boolean };

export type OpenRouterCompletionRequest = {
  model?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
};

export type OpenRouterCompletionResponse = {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  created: number;
};

export type OpenRouterModelListEntry = {
  id: string;
  name: string;
  description?: string;
  pricing: { prompt: string; completion: string; request: string; image: string };
  context_length: number;
  architecture: { modality: string; tokenizer: string; instruct_type: string };
};

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

export async function testOpenRouterKeyLive(key?: string): Promise<OpenRouterKeyTestResult> {
  const formatCheck = testOpenRouterKey(key);
  if (!formatCheck.valid) return formatCheck;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!response.ok) {
      return { valid: false, message: `OpenRouter returned ${response.status}: ${response.statusText}` };
    }
    const data = await response.json() as { data?: unknown[] };
    return { valid: true, message: "Key validated against OpenRouter API", modelsAvailable: Array.isArray(data.data) ? data.data.length : undefined };
  } catch (err) {
    return { valid: false, message: `Cannot reach OpenRouter: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function getOpenRouterModels(key?: string): Promise<OpenRouterModelListEntry[]> {
  const config = readOpenRouterConfig();
  const apiKey = key ?? (config.configured ? process.env.OPENROUTER_API_KEY : undefined);
  if (!apiKey) return [];
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!response.ok) return [];
    const data = await response.json() as { data?: OpenRouterModelListEntry[] };
    return data.data ?? [];
  } catch {
    return [];
  }
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

export function chooseCheapestCapableModel(
  _input: { requiredContextLength?: number; requireVision?: boolean; preferPaid?: boolean },
  config?: ReturnType<typeof readOpenRouterConfig>
): OpenRouterQuote {
  const cfg = config ?? readOpenRouterConfig();
  return chooseOpenRouterModel(cfg);
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

export function estimateOpenRouterCost(input: { promptTokens?: number; completionTokens?: number; modelId?: string }): { promptCost: number; completionCost: number; totalCost: number; currency: string } {
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  return {
    promptCost: promptTokens * 0.000001,
    completionCost: completionTokens * 0.000002,
    totalCost: (promptTokens * 0.000001 + completionTokens * 0.000002),
    currency: "USD"
  };
}

export async function createChatCompletion(request: OpenRouterCompletionRequest): Promise<OpenRouterCompletionResponse> {
  const config = readOpenRouterConfig();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured. Set OPENROUTER_API_KEY in environment.");
  }
  const model = request.model ?? (config.defaultModel ?? config.freeModel ?? "openrouter/auto");

  assertOpenRouterKeyNotLogged(apiKey);

  const body = JSON.stringify({
    model,
    messages: request.messages,
    max_tokens: request.maxTokens ?? 1000,
    temperature: request.temperature ?? 0.7,
    top_p: request.topP ?? 1,
    stream: false
  });

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body,
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    id: string;
    model: string;
    choices: Array<{ index: number; message: { role: string; content: string }; finish_reason: string }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    created: number;
  };

  const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const cost = estimateOpenRouterCost({ promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, modelId: model });

  return {
    id: data.id ?? "",
    model: data.model ?? model,
    choices: (data.choices ?? []).map((c) => ({
      index: c.index,
      message: { role: c.message.role as "assistant", content: c.message.content ?? "" },
      finishReason: c.finish_reason ?? "stop"
    })),
    usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens, cost: cost.totalCost },
    created: data.created ?? Date.now()
  };
}

let dailyUsageTotal: number = 0;
let dailyUsageDate: string = "";

export function recordOpenRouterUsage(cost: number): void {
  const today = new Date().toISOString().split("T")[0];
  if (dailyUsageDate !== today) {
    dailyUsageTotal = 0;
    dailyUsageDate = today;
  }
  dailyUsageTotal += cost;
}

export function getDailyUsage(): number {
  const today = new Date().toISOString().split("T")[0];
  if (dailyUsageDate !== today) return 0;
  return dailyUsageTotal;
}

export async function createEmbedding(input: { model?: string; input: string | string[] }): Promise<{ embeddings: number[][]; model: string; usage: { promptTokens: number; totalTokens: number } }> {
  const config = readOpenRouterConfig();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
  const model = input.model ?? "openai/text-embedding-3-small";

  const response = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, input: input.input }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) throw new Error(`OpenRouter embeddings error ${response.status}`);

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
    model: string;
    usage: { prompt_tokens: number; total_tokens: number };
  };

  return {
    embeddings: data.data.map((d) => d.embedding),
    model: data.model,
    usage: { promptTokens: data.usage.prompt_tokens, totalTokens: data.usage.total_tokens }
  };
}
