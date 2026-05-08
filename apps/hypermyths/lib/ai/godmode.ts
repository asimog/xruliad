import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";

export interface GodmodeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GodmodeChoice {
  message?: {
    content?: string | null;
  };
}

interface GodmodeResponse {
  choices?: GodmodeChoice[];
}

const DEFAULT_GODMODE_MODEL = "ultraplinian/fast";

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  throw new Error("No JSON object found in model response");
}

export function getDefaultGodmodeModel(): string {
  return getEnv().GODMODE_MODEL?.trim() || DEFAULT_GODMODE_MODEL;
}

export function getGodmodeRuntimeConfig() {
  const env = getEnv();
  const baseUrl = env.GODMODE_API_BASE_URL?.replace(/\/+$/, "") ?? null;
  return {
    apiKey: env.GODMODE_API_KEY ?? null,
    baseUrl,
    model: getDefaultGodmodeModel(),
  };
}

export function buildGodmodeHeaders(apiKey: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

export function buildGodmodeChatPayload(params: {
  messages: GodmodeMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
}) {
  return {
    model: params.model?.trim() || getDefaultGodmodeModel(),
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 1200,
    stream: params.stream ?? false,
    // Keep the orchestration layer, but disable prompt-warping transforms so
    // JSON/script generation stays stable inside the HyperMyths pipeline.
    godmode: false,
    autotune: true,
    parseltongue: false,
    stm_modules: [],
    contribute_to_dataset: false,
  };
}

async function requestGodmodeChatCompletion(input: {
  messages: GodmodeMessage[];
  temperature: number;
  maxTokens: number;
  model: string;
  baseUrl: string;
  apiKey: string | null;
}): Promise<GodmodeResponse> {
  return withRetry(
    async () => {
      const response = await fetchWithTimeout(
        `${input.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: buildGodmodeHeaders(input.apiKey),
          body: JSON.stringify(
            buildGodmodeChatPayload({
              messages: input.messages,
              model: input.model,
              temperature: input.temperature,
              maxTokens: input.maxTokens,
            }),
          ),
        },
        30_000,
      );

      if (!response.ok) {
        const body = await response.text();
        if (isRetryableHttpStatus(response.status)) {
          throw new RetryableError(
            `G0DM0D3 failed (${response.status}): ${body}`,
          );
        }
        throw new Error(`G0DM0D3 failed (${response.status}): ${body}`);
      }

      return (await response.json()) as GodmodeResponse;
    },
    {
      attempts: 3,
      baseDelayMs: 700,
      maxDelayMs: 4_000,
    },
  );
}

export async function godmodeChat(params: {
  messages: GodmodeMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const runtime = getGodmodeRuntimeConfig();
  if (!runtime.baseUrl) {
    throw new Error("GODMODE_API_BASE_URL is required for text inference.");
  }

  const payload = await requestGodmodeChatCompletion({
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
    maxTokens: params.maxTokens ?? 1200,
    model: params.model?.trim() || runtime.model,
    baseUrl: runtime.baseUrl,
    apiKey: runtime.apiKey,
  });

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("G0DM0D3 returned an empty response.");
  }
  return content;
}

export async function godmodeJson<T>(params: {
  messages: GodmodeMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<T> {
  const content = await godmodeChat(params);
  try {
    const jsonText = extractJson(content);
    return JSON.parse(jsonText) as T;
  } catch (error) {
    const parseError =
      error instanceof Error ? error : new Error(String(error));
    throw new Error(
      `G0DM0D3 returned invalid JSON: ${parseError.message}. Response preview: ${content.slice(0, 200)}`,
    );
  }
}
