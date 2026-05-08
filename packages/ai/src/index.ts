export type AiProvider = "openrouter" | "openai" | "xai" | "huggingface" | "local";
export type ModelRoute = { provider: AiProvider; model: string; baseUrl?: string };
export function openRouterRoute(model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"): ModelRoute {
  return { provider: "openrouter", model, baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1" };
}
