import type { PrivacyTier } from "@hypermyths/privacy";
import type { AppRuntimeMode } from "@hypermyths/runtime";
import { readQvacStatus } from "@hypermyths/qvac";

export type EmbeddingProvider = "qvac" | "openai" | "openrouter" | "none";
export type EmbeddingStatus = "available" | "unavailable" | "blocked";

export type MemoryChunk = {
  id: string;
  memoryId: string;
  index: number;
  text: string;
  embedding?: number[];
  embeddingModel?: string;
  embeddingStatus: EmbeddingStatus;
  createdAt: string;
};

export type VectorSearchResult = {
  chunkId: string;
  memoryId: string;
  text: string;
  score: number;
};

export type VectorSearchQuery = {
  query: string;
  maxResults?: number;
  minScore?: number;
  visibilityFilter?: string[];
  privacyTierFilter?: PrivacyTier[];
};

export function chunkText(input: { text: string; memoryId: string; maxChunkChars?: number }): MemoryChunk[] {
  const maxChars = input.maxChunkChars ?? 1500;
  const chunks: MemoryChunk[] = [];
  for (let i = 0; i < input.text.length; i += maxChars) {
    chunks.push({
      id: crypto.randomUUID(),
      memoryId: input.memoryId,
      index: chunks.length,
      text: input.text.slice(i, i + maxChars),
      embeddingStatus: "unavailable",
      createdAt: new Date().toISOString()
    });
  }
  return chunks;
}

export function chooseEmbeddingProvider(input: { privacyTier: PrivacyTier; runtimeMode: AppRuntimeMode; qvacAvailable?: boolean }): { provider: EmbeddingProvider; allowed: boolean; reason: string } {
  if (input.privacyTier === "wallet_or_key_material") return { provider: "none", allowed: false, reason: "Wallet/key material cannot be embedded" };
  if (input.privacyTier === "private_strategy") {
    if (input.qvacAvailable) return { provider: "qvac", allowed: true, reason: "Local QVAC embeddings for private strategy" };
    return { provider: "none", allowed: false, reason: "QVAC unavailable for private strategy embeddings" };
  }
  return { provider: "openrouter", allowed: true, reason: "Cloud-safe embedding provider" };
}

export function searchTheses(_query: VectorSearchQuery): VectorSearchResult[] {
  return [];
}

export function searchMemory(_query: VectorSearchQuery): VectorSearchResult[] {
  return [];
}

export function searchDocuments(_query: VectorSearchQuery): VectorSearchResult[] {
  return [];
}

export function vectorMemoryStatus(env: NodeJS.ProcessEnv = process.env) {
  const qvac = readQvacStatus(env);
  const enabled = (env.MEMORY_ENABLE_VECTOR ?? "true") === "true";
  return { enabled, qvacAvailable: qvac.paired && qvac.enabled, embeddingStatus: enabled ? "available" : "unavailable" };
}
