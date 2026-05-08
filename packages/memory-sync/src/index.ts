import { readRuntimeConfig, type AppRuntimeMode, type RuntimeConfig } from "@hypermyths/runtime";
import type { PrivacyTier } from "@hypermyths/privacy";
import type { MemoryVisibility } from "@hypermyths/agent-memory";
import { chooseMemoryStore, shouldSyncToCloud, requireSyncApproval } from "@hypermyths/agent-memory";

export type SyncQueueItem = {
  id: string;
  memoryId: string;
  target: "local_to_cloud" | "cloud_to_local";
  visibility: MemoryVisibility;
  privacyTier: PrivacyTier;
  content: string;
  requiresApproval: boolean;
  requiresEncryption: boolean;
  approved: boolean;
  encrypted: boolean;
  status: "queued" | "approved" | "synced" | "failed" | "blocked";
  reason: string;
  createdAt: string;
};

export type SyncPolicy = {
  autoSyncPublic: boolean;
  requireApprovalForSensitive: boolean;
  requireApprovalForPrivate: boolean;
  blockKeyMaterial: boolean;
  encryptBeforeSync: boolean;
};

export function readSyncPolicy(env: NodeJS.ProcessEnv = process.env): SyncPolicy {
  return {
    autoSyncPublic: (env.MEMORY_AUTO_SYNC_PUBLIC ?? "true") === "true",
    requireApprovalForSensitive: (env.MEMORY_REQUIRE_APPROVAL_FOR_CLOUD_SYNC ?? "true") === "true",
    requireApprovalForPrivate: true,
    blockKeyMaterial: (env.MEMORY_BLOCK_KEY_MATERIAL ?? "true") === "true",
    encryptBeforeSync: (env.MEMORY_ENCRYPT_BEFORE_SYNC ?? "false") === "true"
  };
}

export function createSyncItem(input: { memoryId: string; visibility: MemoryVisibility; privacyTier: PrivacyTier; content: string; target: "local_to_cloud" | "cloud_to_local"; config: RuntimeConfig; policy: SyncPolicy }): SyncQueueItem {
  if (input.policy.blockKeyMaterial && input.privacyTier === "wallet_or_key_material") {
    return { id: crypto.randomUUID(), memoryId: input.memoryId, target: input.target, visibility: input.visibility, privacyTier: input.privacyTier, content: "", requiresApproval: true, requiresEncryption: true, approved: false, encrypted: false, status: "blocked", reason: "Key material blocked from sync", createdAt: new Date().toISOString() };
  }
  const sync = shouldSyncToCloud({ visibility: input.visibility, privacyTier: input.privacyTier, runtimeMode: input.config.appRuntimeMode });
  if (!sync.allowed) {
    return { id: crypto.randomUUID(), memoryId: input.memoryId, target: input.target, visibility: input.visibility, privacyTier: input.privacyTier, content: "", requiresApproval: true, requiresEncryption: false, approved: false, encrypted: false, status: "blocked", reason: sync.reason, createdAt: new Date().toISOString() };
  }
  const needsApproval = requireSyncApproval({ privacyTier: input.privacyTier, visibility: input.visibility });
  const needsEncryption = input.policy.encryptBeforeSync;
  const autoApprove = input.visibility === "public" && input.policy.autoSyncPublic && !needsApproval;
  return {
    id: crypto.randomUUID(),
    memoryId: input.memoryId,
    target: input.target,
    visibility: input.visibility,
    privacyTier: input.privacyTier,
    content: needsEncryption ? "[encrypted]" : input.content,
    requiresApproval: needsApproval,
    requiresEncryption: needsEncryption,
    approved: autoApprove,
    encrypted: needsEncryption,
    status: autoApprove ? "synced" : needsApproval ? "queued" : "synced",
    reason: sync.reason,
    createdAt: new Date().toISOString()
  };
}

export function blockForbiddenMemorySync(input: { visibility: MemoryVisibility; privacyTier: PrivacyTier }): { blocked: boolean; reason: string } {
  if (input.privacyTier === "wallet_or_key_material") return { blocked: true, reason: "Wallet/key material forbidden" };
  if (input.visibility === "local_only") return { blocked: true, reason: "Local-only visibility forbids sync" };
  return { blocked: false, reason: "Allowed" };
}

export function memorySyncStatus(env: NodeJS.ProcessEnv = process.env) {
  const config = readRuntimeConfig(env);
  const policy = readSyncPolicy(env);
  return { config: { mode: config.appRuntimeMode }, policy, cloudSyncAllowed: config.appRuntimeMode !== "local" };
}
