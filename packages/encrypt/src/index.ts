export type EncryptStatus = { enabled: boolean; network: string; programId?: string; rpcUrl?: string; localFallback: boolean; realDevnet: boolean };
export type EncryptedPayload = { id: string; mode: "encrypt_devnet" | "local_fallback"; ciphertext: string; createdAt: string };

export type EncryptConfig = {
  rpcUrl?: string;
  programId?: string;
  network: string;
  localFallback: boolean;
};

export function readEncryptStatus(env: NodeJS.ProcessEnv = process.env): EncryptStatus {
  return { enabled: env.ENCRYPT_ENABLED === "true", network: env.ENCRYPT_NETWORK ?? "devnet", programId: env.ENCRYPT_PROGRAM_ID, rpcUrl: env.ENCRYPT_RPC_URL, localFallback: env.ENCRYPT_LOCAL_FALLBACK !== "false", realDevnet: Boolean(env.ENCRYPT_PROGRAM_ID && env.ENCRYPT_RPC_URL && env.ENCRYPT_ENABLED === "true") };
}

export function encryptPayloadLocalFallback(plaintext: string): EncryptedPayload {
  const status = readEncryptStatus();
  return { id: crypto.randomUUID(), mode: status.realDevnet ? "encrypt_devnet" : "local_fallback", ciphertext: Buffer.from(plaintext, "utf8").toString("base64"), createdAt: new Date().toISOString() };
}

export function readEncryptConfig(env: NodeJS.ProcessEnv = process.env): EncryptConfig {
  return {
    rpcUrl: env.ENCRYPT_RPC_URL,
    programId: env.ENCRYPT_PROGRAM_ID,
    network: env.ENCRYPT_NETWORK ?? "devnet",
    localFallback: env.ENCRYPT_LOCAL_FALLBACK !== "false"
  };
}

export function encryptStatus(env: NodeJS.ProcessEnv = process.env) {
  const cfg = readEncryptConfig(env);
  const enabled = env.ENCRYPT_ENABLED === "true";
  if (!enabled) return { status: "disabled" as const, reason: "ENCRYPT_ENABLED is not true" };
  if (cfg.programId && cfg.rpcUrl) return { status: "configured" as const, config: cfg };
  if (cfg.localFallback) return { status: "local_fallback" as const, config: cfg, note: "Using local base64 fallback" };
  return { status: "missing_config" as const, config: cfg, reason: "Missing ENCRYPT_PROGRAM_ID or ENCRYPT_RPC_URL" };
}
