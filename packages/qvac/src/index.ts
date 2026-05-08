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
