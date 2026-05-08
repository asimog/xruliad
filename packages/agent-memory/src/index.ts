import type { AppRuntimeMode } from "@hypermyths/runtime";
import type { PrivacyTier } from "@hypermyths/privacy";
import { readSupabaseStatus } from "@hypermyths/supabase";

export type MemoryVisibility = "public" | "unlisted" | "private" | "local_only" | "encrypted" | "redacted";
export type MemoryKind = "session" | "command" | "thesis" | "agent_run" | "tool_result" | "receipt" | "artifact" | "strategy" | "research" | "code" | "message";

export type MemoryEntry = {
  id: string;
  userId?: string;
  agentId?: string;
  kind: MemoryKind;
  visibility: MemoryVisibility;
  privacyTier: PrivacyTier;
  title: string;
  content: string;
  source?: string;
  commandId?: string;
  thesisId?: string;
  jobId?: string;
  embeddingAvailable: boolean;
  cloudSynced: boolean;
  syncApproved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemoryStoreTarget = "local" | "cloud" | "blocked";
export type MemoryRouteResult = { target: MemoryStoreTarget; reason: string; requiresApproval: boolean; requiresEncryption: boolean };

export function chooseMemoryStore(input: { visibility: MemoryVisibility; privacyTier: PrivacyTier; runtimeMode: AppRuntimeMode }): MemoryRouteResult {
  if (input.visibility === "local_only") return { target: "local", reason: "Local-only visibility flag", requiresApproval: false, requiresEncryption: false };
  if (input.privacyTier === "wallet_or_key_material") return { target: "blocked", reason: "Wallet/key material cannot be stored in Supabase", requiresApproval: true, requiresEncryption: true };
  if (input.privacyTier === "private_strategy") {
    if (input.runtimeMode === "web") return { target: "blocked", reason: "Private strategy requires local mode", requiresApproval: true, requiresEncryption: true };
    return { target: "local", reason: "Private strategy stays local", requiresApproval: false, requiresEncryption: false };
  }
  if (input.privacyTier === "medical_research_sensitive") return { target: "cloud", reason: "Sensitive research must be redacted or require approval", requiresApproval: true, requiresEncryption: true };
  if (input.privacyTier === "proprietary_code") return { target: "cloud", reason: "Proprietary code may be stored if policy-approved", requiresApproval: true, requiresEncryption: false };
  if (input.visibility === "encrypted" || input.visibility === "redacted") return { target: "cloud", reason: `Encrypted/redacted visibility allowed in cloud`, requiresApproval: false, requiresEncryption: false };
  return { target: "cloud", reason: "Public/internal memory allowed in cloud", requiresApproval: false, requiresEncryption: false };
}

export function shouldEmbed(input: { privacyTier: PrivacyTier; qvacAvailable?: boolean }): { allowed: boolean; provider: "qvac" | "cloud" | "unavailable" } {
  if (input.privacyTier === "wallet_or_key_material") return { allowed: false, provider: "unavailable" };
  if (input.privacyTier === "private_strategy" && input.qvacAvailable) return { allowed: true, provider: "qvac" };
  if (input.privacyTier === "private_strategy") return { allowed: false, provider: "unavailable" };
  return { allowed: true, provider: "cloud" };
}

export function shouldSyncToCloud(input: { visibility: MemoryVisibility; privacyTier: PrivacyTier; runtimeMode: AppRuntimeMode }): { allowed: boolean; reason: string } {
  if (input.visibility === "local_only") return { allowed: false, reason: "Local-only visibility" };
  if (input.privacyTier === "wallet_or_key_material") return { allowed: false, reason: "Wallet/key material blocked" };
  if (input.privacyTier === "private_strategy" && input.runtimeMode === "web") return { allowed: false, reason: "Private strategy cannot sync from web" };
  return { allowed: true, reason: "Sync allowed" };
}

export function requireSyncApproval(input: { privacyTier: PrivacyTier; visibility: MemoryVisibility }): boolean {
  if (input.privacyTier === "sensitive" || input.privacyTier === "medical_research_sensitive") return true;
  if (input.visibility === "private" || input.visibility === "encrypted") return true;
  return false;
}

export function createMemoryEntry(input: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt" | "cloudSynced" | "syncApproved" | "embeddingAvailable"> & { embeddingAvailable?: boolean; cloudSynced?: boolean; syncApproved?: boolean }): MemoryEntry {
  return {
    ...input,
    id: crypto.randomUUID(),
    embeddingAvailable: input.embeddingAvailable ?? false,
    cloudSynced: input.cloudSynced ?? false,
    syncApproved: input.syncApproved ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createMemoryReceipt(memory: MemoryEntry) {
  return { id: crypto.randomUUID(), memoryId: memory.id, kind: memory.kind, visibility: memory.visibility, privacyTier: memory.privacyTier, createdAt: new Date().toISOString() };
}

export function memoryStatus(env: NodeJS.ProcessEnv = process.env) {
  const supabase = readSupabaseStatus(env);
  const localEnabled = (env.LOCAL_MEMORY_ENABLED ?? "true") === "true";
  const cloudEnabled = (env.CLOUD_MEMORY_ENABLED ?? "true") === "true";
  const mode = env.MEMORY_MODE ?? "hybrid";
  return { supabase, localEnabled, cloudEnabled, mode, localSupabaseConfigured: Boolean(env.LOCAL_SUPABASE_URL), requiresApprovalForCloudSync: (env.MEMORY_REQUIRE_APPROVAL_FOR_CLOUD_SYNC ?? "true") === "true" };
}
