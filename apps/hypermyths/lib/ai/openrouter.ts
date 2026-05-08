import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";

export interface OpenRouterMessage {
  role: "system" | "user";
  content: string;
}

interface OpenRouterChoice {
  message?: {
    content?: string | null;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

// Free-tier models are tried first; they have rate limits but cost nothing.
const OPENROUTER_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwq-32b:free",
  "mistralai/mistral-7b-instruct:free",
] as const;

const DEFAULT_OPENROUTER_MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "anthropic/claude-3.5-haiku",
  "mistralai/mistral-small-3.1-24b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
] as const;

class OpenRouterRequestError extends Error {
  readonly model: string;
  readonly status: number;
  readonly responseBody: string;

  constructor(input: { model: string; status: number; responseBody: string }) {
    super(
      `OpenRouter request failed for model '${input.model}' (${input.status}): ${input.responseBody}`,
    );
    this.name = "OpenRouterRequestError";
    this.model = input.model;
    this.status = input.status;
    this.responseBody = input.responseBody;
  }
}

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

function resolveModelCandidates(env: ReturnType<typeof getEnv>): string[] {
  const configured = env.OPENROUTER_MODEL?.trim();
  const configuredFree = env.OPENROUTER_FREE_MODEL?.trim();

  // Build candidate list: configured free override → free tier pool → configured paid → paid defaults
  const freePool = configuredFree
    ? [configuredFree, ...OPENROUTER_FREE_MODELS.filter((m) => m !== configuredFree)]
    : [...OPENROUTER_FREE_MODELS];

  const paidPool = [configured, ...DEFAULT_OPENROUTER_MODELS].filter(
    (v): v is string => Boolean(v && v.length > 0),
  );

  return [...new Set([...freePool, ...paidPool])];
}

async function requestChatCompletion(input: {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  maxTokens: number;
  baseUrl: string;
  apiKey: string;
}): Promise<OpenRouterResponse> {
  const env = getEnv();

  return withRetry(
    async () => {
      const response = await fetchWithTimeout(
        `${input.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.apiKey}`,
            ...(env.OPENROUTER_SITE_URL
              ? { "HTTP-Referer": env.OPENROUTER_SITE_URL }
              : {}),
            "X-Title": env.OPENROUTER_APP_NAME,
          },
          body: JSON.stringify({
            model: input.model,
            messages: input.messages,
            temperature: input.temperature,
            max_tokens: input.maxTokens,
          }),
        },
        18_000,
      );

      if (!response.ok) {
        const body = await response.text();
        if (isRetryableHttpStatus(response.status)) {
          throw new RetryableError(
            `OpenRouter retryable request failed for model '${input.model}' (${response.status}): ${body}`,
          );
        }

        throw new OpenRouterRequestError({
          model: input.model,
          status: response.status,
          responseBody: body,
        });
      }

      return (await response.json()) as OpenRouterResponse;
    },
    {
      attempts: 3,
      baseDelayMs: 700,
      maxDelayMs: 4_000,
    },
  );
}

export async function openRouterChat(params: {
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}): Promise<string> {
  const env = getEnv();
  const apiKey = params.apiKey ?? env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is required for OpenRouter chat completions.",
    );
  }
  const modelCandidates = [
    params.model?.trim(),
    ...resolveModelCandidates(env),
  ].filter((value): value is string => Boolean(value && value.length > 0));
  const deduped = [...new Set(modelCandidates)];
  const temperature = params.temperature ?? 0.2;
  const maxTokens = params.maxTokens ?? 1200;
  const baseUrl = (params.baseUrl ?? env.OPENROUTER_BASE_URL).replace(
    /\/+$/,
    "",
  );

  let lastError: unknown = null;
  for (const model of deduped) {
    try {
      const payload = await requestChatCompletion({
        model,
        messages: params.messages,
        temperature,
        maxTokens,
        baseUrl,
        apiKey,
      });

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (content) {
        return content;
      }

      lastError = new Error(
        `OpenRouter returned empty response content for model '${model}'`,
      );
      logger.warn("openrouter_empty_response_try_next_model", {
        component: "openrouter",
        stage: "chat_completions",
        errorCode: "openrouter_empty_response",
        errorMessage:
          lastError instanceof Error ? lastError.message : "Unknown error",
        model,
      });
    } catch (error) {
      lastError = error;
      if (
        error instanceof OpenRouterRequestError &&
        error.status !== 401 &&
        error.status !== 403
      ) {
        logger.warn("openrouter_model_failed_try_next_model", {
          component: "openrouter",
          stage: "chat_completions",
          errorCode: "openrouter_model_failed",
          errorMessage: error.message,
          model: error.model,
          status: error.status,
        });
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter did not return a usable response for any model");
}

export async function openRouterJson<T>(params: {
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}): Promise<T> {
  const content = await openRouterChat(params);
  try {
    const jsonText = extractJson(content);
    return JSON.parse(jsonText) as T;
  } catch (error) {
    const parseError =
      error instanceof Error ? error : new Error(String(error));
    throw new Error(
      `OpenRouter returned invalid JSON: ${parseError.message}. Response preview: ${content.slice(0, 200)}`,
    );
  }
}
