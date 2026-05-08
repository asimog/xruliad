export type VaultSealMode = "encrypt_devnet" | "local_fallback" | "unavailable";
export type SealedStrategyRecord = {
  id: string;
  mode: VaultSealMode;
  ciphertext: string;
  publicSummary?: string;
  createdAt: string;
};

export function sealStrategyRecord(input: { plaintext: string; publicSummary?: string; mode?: VaultSealMode }): SealedStrategyRecord {
  const mode = input.mode ?? (process.env.ENCRYPT_ENABLED === "true" ? "encrypt_devnet" : "local_fallback");
  const ciphertext = Buffer.from(input.plaintext, "utf8").toString("base64");
  return { id: crypto.randomUUID(), mode, ciphertext, publicSummary: input.publicSummary, createdAt: new Date().toISOString() };
}

export function vaultStatus() {
  return {
    localOnly: process.env.STRATEGY_VAULT_LOCAL_ONLY !== "false",
    encryptEnabled: process.env.ENCRYPT_ENABLED === "true",
    fallbackEnabled: process.env.ENCRYPT_LOCAL_FALLBACK !== "false"
  };
}
