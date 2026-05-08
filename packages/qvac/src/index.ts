export type QvacMode = "optional" | "required_for_private" | "disabled";
export type QvacStatus = {
  enabled: boolean;
  mode: QvacMode;
  baseUrl: string;
  gatewayUrl: string;
  paired: boolean;
  localPrivatePreferred: boolean;
  remoteFallbackAllowed: boolean;
  referencePath?: string;
};

export function readQvacStatus(env: NodeJS.ProcessEnv = process.env): QvacStatus {
  return {
    enabled: env.QVAC_ENABLED !== "false",
    mode: env.QVAC_MODE === "required_for_private" ? "required_for_private" : env.QVAC_MODE === "disabled" ? "disabled" : "optional",
    baseUrl: env.QVAC_BASE_URL ?? "http://localhost:11434/v1",
    gatewayUrl: env.QVAC_GATEWAY_URL ?? "http://localhost:8787",
    paired: Boolean(env.QVAC_API_KEY) && env.QVAC_PAIRING_REQUIRED !== "false",
    localPrivatePreferred: env.QVAC_REQUIRE_LOCAL_FOR_PRIVATE !== "false",
    remoteFallbackAllowed: env.QVAC_ALLOW_REMOTE_FALLBACK === "true",
    referencePath: env.QVAC_REFERENCE_PATH ?? "C:\\qvacenterprise"
  };
}

export async function qvacHealth(status = readQvacStatus()): Promise<QvacStatus & { reachable: boolean; note: string }> {
  if (!status.enabled) return { ...status, reachable: false, note: "QVAC disabled." };
  try {
    const response = await fetch(`${status.gatewayUrl}/health`, { signal: AbortSignal.timeout(1500) });
    return { ...status, reachable: response.ok, note: response.ok ? "QVAC gateway reachable." : `QVAC gateway returned ${response.status}.` };
  } catch {
    return { ...status, reachable: false, note: "QVAC gateway unavailable; web-safe features may use cloud routes." };
  }
}

export type QvacCallResult<T> =
  | { ok: true; data: T; provider: "qvac"; local: true }
  | { ok: false; error: string; code: "disabled" | "unavailable" | "unauthorized" | "bad_response" | "request_failed" };

export type QvacChatInput = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  gatewayUrl?: string;
  apiKey?: string;
};

export type QvacEmbedInput = {
  input: string | string[];
  model?: string;
  gatewayUrl?: string;
  apiKey?: string;
};

async function qvacRequest<T>(
  path: string,
  body: unknown,
  status: QvacStatus,
  gatewayUrlOverride?: string,
  apiKeyOverride?: string
): Promise<QvacCallResult<T>> {
  if (!status.enabled) {
    return { ok: false, error: "QVAC is disabled", code: "disabled" };
  }
  const gateway = gatewayUrlOverride ?? status.gatewayUrl;
  const apiKey = apiKeyOverride ?? (status.paired ? process.env.QVAC_API_KEY : undefined);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const response = await fetch(`${gateway}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "QVAC unauthorized", code: "unauthorized" };
    }
    if (!response.ok) {
      return { ok: false, error: `QVAC gateway returned ${response.status}`, code: "bad_response" };
    }
    const data = await response.json() as T;
    return { ok: true, data, provider: "qvac", local: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return { ok: false, error: "QVAC request timed out", code: "unavailable" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "QVAC request failed", code: "unavailable" };
  }
}

export async function qvacChat(input: QvacChatInput): Promise<QvacCallResult<unknown>> {
  const status = readQvacStatus();
  return qvacRequest("/chat", {
    messages: input.messages,
    model: input.model,
    temperature: input.temperature,
    max_tokens: input.maxTokens
  }, status, input.gatewayUrl, input.apiKey);
}

export async function qvacEmbed(input: QvacEmbedInput): Promise<QvacCallResult<unknown>> {
  const status = readQvacStatus();
  return qvacRequest("/embed", {
    input: input.input,
    model: input.model
  }, status, input.gatewayUrl, input.apiKey);
}
