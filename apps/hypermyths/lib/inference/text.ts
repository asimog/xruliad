// Text inference fallback chain.
// Priority: Concentrate -> ElizaOS -> HuggingFace -> G0DM0D3 -> OpenRouter.

import { getEnv } from "@/lib/env";
import { elizaChat, elizaJson, type ElizaMessage } from "@/lib/ai/eliza-text";
import { huggingFaceChat, huggingFaceJson } from "@/lib/ai/huggingface";
import {
  godmodeChat,
  godmodeJson,
  type GodmodeMessage,
} from "@/lib/ai/godmode";
import { openRouterJson, openRouterChat } from "@/lib/ai/openrouter";
import { concentrateChat, concentrateJson } from "@/lib/ai/concentrate";

export interface TextInferenceMessage extends GodmodeMessage {}

type TextProviderAttempt =
  | "concentrate"
  | "eliza"
  | "huggingface"
  | "godmode"
  | "openrouter";

function isGodmodeVirtualModel(model: string | null | undefined): boolean {
  if (!model) return false;
  return model.startsWith("ultraplinian/") || model.startsWith("consortium/");
}

function resolveGodmodeModel(
  env: ReturnType<typeof getEnv>,
  requested: string | null | undefined,
): string {
  return requested?.trim() || env.GODMODE_MODEL || "ultraplinian/fast";
}

function resolveOpenRouterFallbackModel(
  env: ReturnType<typeof getEnv>,
  requested: string | null | undefined,
): string {
  if (requested?.trim() && !isGodmodeVirtualModel(requested)) {
    return requested.trim();
  }
  return env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

function toOpenRouterMessages(messages: TextInferenceMessage[]) {
  return messages
    .filter((m) => m.role === "system" || m.role === "user")
    .map((m) => ({
      role: m.role as "system" | "user",
      content: m.content,
    }));
}

function toStandardMessages(
  messages: TextInferenceMessage[],
): Array<{ role: string; content: string }> {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function resolveTextProviderOrder(
  env: ReturnType<typeof getEnv>,
): TextProviderAttempt[] {
  const preferred = env.TEXT_INFERENCE_PROVIDER;
  const defaults: TextProviderAttempt[] = [
    "concentrate",
    "eliza",
    "huggingface",
    "godmode",
    "openrouter",
  ];

  if (!preferred || preferred === "auto") {
    return defaults;
  }

  return [
    preferred,
    ...defaults.filter((provider) => provider !== preferred),
  ];
}

export async function generateTextInference(params: {
  provider?: string;
  model?: string | null;
  messages: TextInferenceMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  const temperature = params.temperature ?? 0.2;
  const maxTokens = params.maxTokens ?? 1200;
  const standardMessages = toStandardMessages(params.messages);
  let lastError: unknown;

  for (const provider of resolveTextProviderOrder(env)) {
    if (provider === "concentrate" && env.CONCENTRATE_API_KEY) {
      try {
        return await concentrateChat({
          messages: params.messages,
          model: params.model ?? env.CONCENTRATE_MODEL,
          temperature,
          maxTokens,
        });
      } catch (error) {
        lastError = error;
        console.warn("Concentrate failed, trying next provider:", error);
      }
    }

    if (provider === "eliza" && (env.ELIZA_API_KEY || env.ELIZA_VIDEO_API_KEY)) {
      try {
        return await elizaChat({
          messages: standardMessages,
          model: params.model ?? env.ELIZA_MODEL ?? "gpt-4o-mini",
          temperature,
          maxTokens,
        });
      } catch (error) {
        lastError = error;
        console.warn("ElizaOS failed, trying next provider:", error);
      }
    }

    if (provider === "huggingface" && env.HUGGINGFACE_API_KEY) {
      try {
        return await huggingFaceChat({
          messages: standardMessages,
          model: params.model ?? env.HUGGINGFACE_MODEL,
          temperature,
          maxTokens,
        });
      } catch (error) {
        lastError = error;
        console.warn("HuggingFace failed, trying next provider:", error);
      }
    }

    if (provider === "godmode" && env.GODMODE_API_BASE_URL && env.GODMODE_API_KEY) {
      const godmodeModel = resolveGodmodeModel(env, params.model);
      try {
        return await godmodeChat({
          messages: params.messages,
          model: godmodeModel,
          temperature,
          maxTokens,
        });
      } catch (error) {
        lastError = error;
        console.warn("G0DM0D3 failed, trying next provider:", error);
      }
    }

    if (provider === "openrouter" && env.OPENROUTER_API_KEY) {
      try {
        return await openRouterChat({
          messages: toOpenRouterMessages(params.messages),
          temperature,
          maxTokens,
          baseUrl: env.OPENROUTER_BASE_URL,
          model: resolveOpenRouterFallbackModel(env, params.model),
        });
      } catch (error) {
        lastError = error;
        console.warn("OpenRouter failed, trying next provider:", error);
      }
    }
  }

  if (lastError) {
    throw new Error(
      `All text inference providers failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  throw new Error(
    "No text inference providers configured. Set CONCENTRATE_API_KEY, ELIZA_API_KEY (or ELIZA_VIDEO_API_KEY), HUGGINGFACE_API_KEY, GODMODE_API_KEY, or OPENROUTER_API_KEY.",
  );
}

export async function generateTextInferenceJson<T>(params: {
  provider?: string;
  model?: string | null;
  messages: TextInferenceMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const env = getEnv();
  const standardMessages = toStandardMessages(params.messages);
  let lastError: unknown;

  for (const provider of resolveTextProviderOrder(env)) {
    if (provider === "concentrate" && env.CONCENTRATE_API_KEY) {
      try {
        return await concentrateJson<T>({
          messages: params.messages,
          model: params.model ?? env.CONCENTRATE_MODEL,
          temperature: params.temperature ?? 0.1,
          maxTokens: params.maxTokens ?? 1200,
        });
      } catch (error) {
        lastError = error;
        console.warn("Concentrate JSON failed, trying next:", error);
      }
    }

    if (provider === "eliza" && (env.ELIZA_API_KEY || env.ELIZA_VIDEO_API_KEY)) {
      try {
        return await elizaJson<T>({
          messages: standardMessages,
          model: params.model ?? env.ELIZA_MODEL ?? "gpt-4o-mini",
          temperature: params.temperature ?? 0.1,
          maxTokens: params.maxTokens ?? 1200,
        });
      } catch (error) {
        lastError = error;
        console.warn("ElizaOS JSON failed, trying next:", error);
      }
    }

    if (provider === "huggingface" && env.HUGGINGFACE_API_KEY) {
      try {
        return await huggingFaceJson<T>({
          messages: standardMessages,
          model: params.model ?? env.HUGGINGFACE_MODEL,
          temperature: params.temperature ?? 0.1,
          maxTokens: params.maxTokens ?? 1200,
        });
      } catch (error) {
        lastError = error;
        console.warn("HuggingFace JSON failed, trying next:", error);
      }
    }

    if (provider === "godmode" && env.GODMODE_API_BASE_URL && env.GODMODE_API_KEY) {
      const godmodeModel = resolveGodmodeModel(env, params.model);
      try {
        return await godmodeJson<T>({
          messages: params.messages,
          model: godmodeModel,
          temperature: params.temperature ?? 0.2,
          maxTokens: params.maxTokens ?? 1200,
        });
      } catch (error) {
        lastError = error;
        console.warn("G0DM0D3 JSON failed, trying next:", error);
      }
    }

    if (provider === "openrouter" && env.OPENROUTER_API_KEY) {
      try {
        return await openRouterJson<T>({
          messages: toOpenRouterMessages(params.messages),
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          baseUrl: env.OPENROUTER_BASE_URL,
          model: resolveOpenRouterFallbackModel(env, params.model),
        });
      } catch (error) {
        lastError = error;
        console.warn("OpenRouter JSON failed, trying next:", error);
      }
    }
  }

  if (lastError) {
    throw new Error(
      `All text inference providers failed (JSON). Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  throw new Error(
    "No text inference providers configured for JSON. Set CONCENTRATE_API_KEY, ELIZA_API_KEY (or ELIZA_VIDEO_API_KEY), HUGGINGFACE_API_KEY, GODMODE_API_KEY, or OPENROUTER_API_KEY.",
  );
}
