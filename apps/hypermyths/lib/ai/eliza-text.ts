/**
 * ElizaOS (ElizaCloud) text inference client.
 *
 * API: https://www.elizacloud.ai
 * Auth: Authorization: Bearer <api_key>
 * Endpoint: /api/v1/chat (SSE streaming)
 *
 * Supports Vercel AI SDK UIMessage format with role and parts.
 * Returns SSE stream that we parse for text content.
 */

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";

export interface ElizaMessage {
  role: "system" | "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
}

export interface ElizaChatResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
      parts?: Array<{ type: "text"; text: string }>;
    };
    finish_reason?: string;
  }>;
  error?: {
    message?: string;
    code?: string;
  };
}

/**
 * Convert standard messages to Eliza format.
 */
function toElizaMessages(
  messages: Array<{ role: string; content: string }>,
): ElizaMessage[] {
  return messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    parts: [{ type: "text", text: m.content }],
  }));
}

/**
 * Parse SSE streaming response from ElizaOS.
 * Extracts text-delta events from Server-Sent Events stream.
 */
function parseSSEText(stream: string): string {
  const lines = stream.split("\n");
  let text = "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    const data = line.slice(6).trim();
    if (data === "[DONE]") break;

    try {
      const parsed = JSON.parse(data) as { type?: string; delta?: unknown };
      if (parsed.type === "text-delta" && parsed.delta) {
        text += String(parsed.delta);
      }
    } catch {
      // Skip malformed SSE lines
    }
  }

  return text;
}

/**
 * Extract text from Eliza response (handles both SSE and JSON).
 */
function extractText(responseBody: string): string {
  // Try SSE parsing first
  if (responseBody.includes("data:")) {
    const text = parseSSEText(responseBody);
    if (text) return text;
  }

  // Fallback to JSON parsing
  try {
    const parsed = JSON.parse(responseBody) as ElizaChatResponse;

    if (parsed.error) {
      throw new Error(
        `ElizaOS API error: ${parsed.error.message ?? "unknown error"}`,
      );
    }

    const choice = parsed.choices?.[0];
    if (choice?.message) {
      if (choice.message.parts?.length) {
        return choice.message.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n");
      }
      if (choice.message.content) {
        return choice.message.content;
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("ElizaOS API error")) {
      throw e;
    }
  }

  throw new Error(
    `ElizaOS returned no text content: ${responseBody.slice(0, 200)}`,
  );
}

/**
 * Chat with ElizaOS — plain text response.
 */
export async function elizaChat(params: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  const apiKey = env.ELIZA_API_KEY ?? env.ELIZA_VIDEO_API_KEY ?? null;
  const baseUrl = (env.ELIZA_BASE_URL ?? "https://www.elizacloud.ai").replace(
    /\/+$/,
    "",
  );
  const model = params.model ?? env.ELIZA_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "ELIZA_API_KEY or ELIZA_VIDEO_API_KEY is not configured.",
    );
  }

  const body = {
    messages: toElizaMessages(params.messages),
    id: model,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 1200,
    stream: false,
  };

  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${baseUrl}/api/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        },
        30_000,
      );

      if (!res.ok) {
        const errorBody = await res.text();
        const msg = `ElizaOS chat failed (${res.status}): ${errorBody}`;
        if (isRetryableHttpStatus(res.status)) throw new RetryableError(msg);
        throw new Error(msg);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
  );

  // ElizaOS returns SSE even with stream: false — parse as text
  const rawText = await response.text();
  return extractText(rawText);
}

/**
 * Chat with ElizaOS — JSON-parsed response.
 */
export async function elizaJson<T>(params: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  // Add JSON instruction to system prompt
  const messages = [...params.messages];

  // Check if there's a system message
  const hasSystem = messages.some((m) => m.role === "system");
  if (!hasSystem) {
    messages.unshift({
      role: "system",
      content:
        "Respond ONLY with valid JSON. No markdown, no explanation, just JSON.",
    });
  }

  const text = await elizaChat({
    ...params,
    messages,
    temperature: params.temperature ?? 0.1, // Lower temp for JSON
  });

  try {
    // Try parsing directly
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
    throw new Error(`ElizaOS returned invalid JSON: ${text.slice(0, 200)}...`);
  }
}
