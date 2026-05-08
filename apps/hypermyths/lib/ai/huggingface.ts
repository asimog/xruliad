/**
 * HuggingFace Inference API text client.
 * 
 * API: https://huggingface.co/docs/inference-api
 * Auth: Authorization: Bearer <hf_token>
 * Endpoint: POST https://api-inference.huggingface.co/models/{model_id}
 * 
 * Free tier: 30k tokens/min, rate limited.
 * Supports many open-source models.
 */

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";

export interface HuggingFaceChatResponse {
  generated_text?: string;
  error?: string;
}

/**
 * Build HF messages into a single prompt.
 */
function buildPrompt(
  messages: Array<{ role: string; content: string }>,
): string {
  return messages
    .map((m) => {
      const roleTag = m.role === "system" ? "system" : "user";
      return `<|${roleTag}|>\n${m.content}`;
    })
    .join("\n") + "\n<|assistant|>\n";
}

/**
 * Chat with HuggingFace — plain text response.
 */
export async function huggingFaceChat(params: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  const apiKey = env.HUGGINGFACE_API_KEY ?? null;
  const model =
    params.model ??
    env.HUGGINGFACE_MODEL ??
    "mistralai/Mistral-7B-Instruct-v0.3";

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured.");
  }

  const baseUrl = env.HUGGINGFACE_BASE_URL ?? "https://api-inference.huggingface.co";
  const modelPath = model.startsWith("http") ? model : `models/${model}`;
  const url = baseUrl.startsWith("http")
    ? `${baseUrl.replace(/\/+$/, "")}/${modelPath}`
    : `https://api-inference.huggingface.co/${modelPath}`;

  const prompt = buildPrompt(params.messages);

  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              temperature: params.temperature ?? 0.2,
              max_new_tokens: params.maxTokens ?? 1200,
              return_full_text: false,
              do_sample: true,
            },
          }),
        },
        60_000, // HF can be slow
      );

      if (!res.ok) {
        const errorBody = await res.text();
        const msg = `HuggingFace chat failed (${res.status}): ${errorBody}`;

        // Model loading = retryable (503)
        if (res.status === 503) {
          throw new RetryableError(
            `${msg} (model loading, try again later)`,
          );
        }
        if (isRetryableHttpStatus(res.status))
          throw new RetryableError(msg);
        throw new Error(msg);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 2000, maxDelayMs: 10000 },
  );

  const data = (await response.json()) as
    | HuggingFaceChatResponse[]
    | HuggingFaceChatResponse
    | { error: string };

  // HF returns array of generated texts
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim();
  }

  if (!Array.isArray(data) && "generated_text" in data && data.generated_text) {
    return data.generated_text.trim();
  }

  if ("error" in data && data.error) {
    throw new Error(`HuggingFace API error: ${data.error}`);
  }

  throw new Error("HuggingFace returned unexpected response format.");
}

/**
 * Chat with HuggingFace — JSON-parsed response.
 */
export async function huggingFaceJson<T>(params: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const messages = [
    {
      role: "system",
      content:
        "Respond ONLY with valid JSON. No markdown, no explanation, just JSON.",
    },
    ...params.messages,
  ];

  const text = await huggingFaceChat({
    ...params,
    messages,
    temperature: params.temperature ?? 0.1,
  });

  try {
    return JSON.parse(text) as T;
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        // Continue to error
      }
    }
    throw new Error(
      `HuggingFace returned invalid JSON: ${text.slice(0, 200)}...`,
    );
  }
}
