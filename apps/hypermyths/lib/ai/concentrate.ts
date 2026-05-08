import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";

export interface ConcentrateMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type ConcentrateOutputContent = {
  type?: string;
  text?: string | null;
};

type ConcentrateOutput = {
  type?: string;
  role?: string;
  content?: ConcentrateOutputContent[];
};

type ConcentrateResponse = {
  output?: ConcentrateOutput[];
  error?: {
    code?: string;
    message?: string;
  };
};

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  throw new Error("No JSON object found in Concentrate response");
}

function splitMessages(messages: ConcentrateMessage[]) {
  const instructions = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();

  const input = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n")
    .trim();

  return {
    instructions: instructions || undefined,
    input: input || messages.map((message) => message.content).join("\n\n"),
  };
}

function extractOutputText(payload: ConcentrateResponse): string {
  if (payload.error?.message) {
    throw new Error(`Concentrate API error: ${payload.error.message}`);
  }

  const text = (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" || content.text)
    .map((content) => content.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Concentrate returned no output text.");
  }

  return text;
}

export async function concentrateChat(params: {
  messages: ConcentrateMessage[];
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  if (!env.CONCENTRATE_API_KEY) {
    throw new Error("CONCENTRATE_API_KEY is not configured.");
  }

  const baseUrl = env.CONCENTRATE_BASE_URL.replace(/\/+$/, "");
  const { instructions, input } = splitMessages(params.messages);

  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${baseUrl}/responses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.CONCENTRATE_API_KEY}`,
          },
          body: JSON.stringify({
            model: params.model?.trim() || env.CONCENTRATE_MODEL,
            input,
            instructions,
            temperature: params.temperature ?? 0.2,
            max_output_tokens: params.maxTokens ?? 1200,
            store: false,
          }),
        },
        30_000,
      );

      if (!res.ok) {
        const body = await res.text();
        const message = `Concentrate request failed (${res.status}): ${body}`;
        if (isRetryableHttpStatus(res.status)) throw new RetryableError(message);
        throw new Error(message);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 900, maxDelayMs: 5_000 },
  );

  return extractOutputText((await response.json()) as ConcentrateResponse);
}

export async function concentrateJson<T>(params: {
  messages: ConcentrateMessage[];
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const text = await concentrateChat({
    ...params,
    messages: [
      {
        role: "system",
        content: "Respond only with valid JSON. Do not include markdown.",
      },
      ...params.messages,
    ],
    temperature: params.temperature ?? 0.1,
  });

  try {
    return JSON.parse(extractJson(text)) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Concentrate returned invalid JSON: ${message}. Response preview: ${text.slice(0, 200)}`,
    );
  }
}
