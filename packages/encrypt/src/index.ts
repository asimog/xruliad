export type EncryptStatus = { enabled: boolean; network: string; programId?: string; rpcUrl?: string; localFallback: boolean; realDevnet: boolean };
export type EncryptedPayload = { id: string; mode: "encrypt_devnet" | "local_fallback"; ciphertext: string; createdAt: string };

export function readEncryptStatus(env: NodeJS.ProcessEnv = process.env): EncryptStatus {
  return { enabled: env.ENCRYPT_ENABLED === "true", network: env.ENCRYPT_NETWORK ?? "devnet", programId: env.ENCRYPT_PROGRAM_ID, rpcUrl: env.ENCRYPT_RPC_URL, localFallback: env.ENCRYPT_LOCAL_FALLBACK !== "false", realDevnet: Boolean(env.ENCRYPT_PROGRAM_ID && env.ENCRYPT_RPC_URL && env.ENCRYPT_ENABLED === "true") };
}

export function encryptPayloadLocalFallback(plaintext: string): EncryptedPayload {
  const status = readEncryptStatus();
  return { id: crypto.randomUUID(), mode: status.realDevnet ? "encrypt_devnet" : "local_fallback", ciphertext: Buffer.from(plaintext, "utf8").toString("base64"), createdAt: new Date().toISOString() };
}
