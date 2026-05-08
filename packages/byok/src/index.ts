import { testOpenRouterKey, redactOpenRouterKey } from "@hypermyths/openrouter";

export type BYOKStorageMode = "browser_local" | "ephemeral_server" | "encrypted_cloud";
export type BYOKConfig = {
  storageMode: BYOKStorageMode;
  allowEphemeralServerUse: boolean;
  allowEncryptedCloudStorage: boolean;
  browserLocalEnabled: boolean;
};

export function readByokConfig(env: NodeJS.ProcessEnv = process.env): BYOKConfig {
  return {
    storageMode: (env.BYOK_OPENROUTER_STORAGE_MODE as BYOKStorageMode) ?? "browser_local",
    allowEphemeralServerUse: (env.BYOK_ALLOW_EPHEMERAL_SERVER_USE ?? "true") === "true",
    allowEncryptedCloudStorage: (env.BYOK_ALLOW_ENCRYPTED_CLOUD_STORAGE ?? "false") === "true",
    browserLocalEnabled: (env.NEXT_PUBLIC_ENABLE_OPENROUTER_BYOK ?? "true") === "true"
  };
}

export function validateKeyForStorage(mode: BYOKStorageMode, key: string): { allowed: boolean; risk: "low" | "medium" | "high"; note: string } {
  const test = testOpenRouterKey(key);
  if (!test.valid) return { allowed: false, risk: "low", note: "Invalid key" };

  if (mode === "browser_local") return { allowed: true, risk: "low", note: "Key stored encrypted in browser localStorage only" };
  if (mode === "ephemeral_server") return { allowed: true, risk: "medium", note: "Key sent to server for one request, not stored" };
  if (mode === "encrypted_cloud") return { allowed: true, risk: "high", note: "Key encrypted before cloud storage. You control the encryption key." };

  return { allowed: false, risk: "high", note: "Unknown storage mode" };
}

export function redactKeyForDisplay(key: string): string {
  return redactOpenRouterKey(key);
}

export function storageModeLabel(mode: BYOKStorageMode): string {
  switch (mode) {
    case "browser_local": return "Browser (encrypted localStorage)";
    case "ephemeral_server": return "Ephemeral (one request only)";
    case "encrypted_cloud": return "Encrypted cloud (requires approval)";
    default: return "Unknown";
  }
}
