import type { PrivacyTier } from "@hypermyths/privacy";
import type { AppRuntimeMode } from "@hypermyths/runtime";
import type { FeedVisibility, FeedPrivacyMode, EncryptedFeedActor, ActorCommitment } from "@hypermyths/feed-privacy";
import { createLocalJobEnvelope, createCloudSafeFeedEnvelope } from "@hypermyths/feed-privacy";

export type FeedProductId = "hypermyths" | "hashmyth" | "polymyths" | "cancerhawk" | "hyperkaon" | "hypertian" | "platform";

export type FeedJobType =
  | "command" | "thesis" | "contribution" | "intelligence" | "prediction"
  | "market_analysis" | "rwa_analysis" | "video" | "video_script" | "ad"
  | "ad_campaign" | "research" | "cancer_research" | "physics_research"
  | "simulation" | "coding" | "github_publish" | "github_pr"
  | "model_eval" | "inference" | "payment" | "paid_api" | "display"
  | "local_trade_intent" | "local_execution_intent" | "strategy_vault"
  | "encrypt_seal" | "ika_policy" | "qvac_local_reasoning";

export type FeedStatus = "queued" | "running" | "complete" | "failed" | "blocked" | "prepared" | "approved" | "rejected" | "sealed" | "published";

export type FeedSource = "web" | "local" | "hybrid";

export type FeedPaymentPlane = "platform" | "user_local" | "free" | null;

export type FeedItem = {
  id: string;
  source_product: FeedProductId;
  source_app?: string;
  source_service?: string;
  job_type: FeedJobType;
  job_id?: string;
  command_id?: string;
  thesis_id?: string;
  actor_mode: "transparent" | "encrypted" | "pseudonymous";
  actor_id?: string;
  actor_pseudonym?: string;
  encrypted_actor?: EncryptedFeedActor;
  actor_commitment?: ActorCommitment;
  title: string;
  safe_summary: string;
  encrypted_content?: string | null;
  redacted_content?: string | null;
  commitment_hash?: string;
  visibility: FeedVisibility;
  privacy_mode: FeedPrivacyMode;
  privacy_tier: PrivacyTier;
  status: FeedStatus;
  runtime_mode: AppRuntimeMode;
  payment_plane: FeedPaymentPlane;
  receipt_id?: string;
  cost_usd?: number;
  currency?: string;
  artifact_id?: string;
  display_artifact_id?: string;
  model_route_id?: string;
  sponsor_metadata?: Record<string, unknown>;
  local_only: boolean;
  cloud_synced: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type FeedEvent = {
  id: string;
  feed_item_id: string;
  event_type: "status_change" | "progress_update" | "artifact_attached" | "receipt_attached" | "comment" | "encrypted_event";
  status?: FeedStatus;
  safe_message: string;
  encrypted_event?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FeedReaction = {
  id: string;
  feed_item_id: string;
  user_id?: string;
  reaction_type: "star" | "bookmark" | "upvote" | "comment";
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FeedFilter = {
  productId?: FeedProductId;
  jobType?: FeedJobType;
  status?: FeedStatus;
  visibility?: FeedVisibility;
  source?: FeedSource;
  privacyTier?: PrivacyTier;
  localOnly?: boolean;
  limit?: number;
  offset?: number;
  since?: string;
  before?: string;
};

export type FeedSyncItem = {
  id: string;
  local_feed_id: string;
  feed_item_id?: string;
  sync_direction: "local_to_cloud" | "cloud_to_local";
  status: "pending" | "approved" | "synced" | "failed";
  privacy_check_status: "pending" | "passed" | "blocked";
  error?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const productToFeedJobTypes: Record<string, FeedJobType[]> = {
  hypermyths: ["command", "thesis", "inference", "strategy_vault", "local_trade_intent", "local_execution_intent", "qvac_local_reasoning"],
  hashmyth: ["video", "video_script", "display"],
  polymyths: ["thesis", "prediction", "market_analysis", "rwa_analysis", "intelligence"],
  cancerhawk: ["research", "cancer_research", "contribution"],
  hyperkaon: ["research", "physics_research", "simulation"],
  hypertian: ["ad", "ad_campaign", "display"],
  platform: ["payment", "paid_api", "github_publish", "github_pr", "model_eval", "inference"]
};

export function normalizeFeedItem(input: {
  id?: string;
  source_product: FeedItem["source_product"];
  job_type: FeedJobType;
  title: string;
  status: FeedStatus;
  runtime_mode: AppRuntimeMode;
  privacy_tier: PrivacyTier;
  source?: FeedSource;
  actor_id?: string;
  actor_display_name?: string;
  content?: string;
  command_id?: string;
  thesis_id?: string;
  job_id?: string;
  payment_plane?: FeedPaymentPlane;
  receipt_id?: string;
  cost_usd?: number;
  local_only?: boolean;
  metadata?: Record<string, unknown>;
}): FeedItem {
  const runtime = input.runtime_mode;
  const privacy = input.privacy_tier;
  const isLocal = runtime === "local" || input.local_only === true;
  const isTrade = input.job_type.includes("trade") || input.job_type.includes("execution");
  const isQvac = input.job_type.includes("qvac");

  if (isLocal) {
    const envelope = createLocalJobEnvelope({ title: input.title, jobType: input.job_type, privacyTier: privacy, actorId: input.actor_id });
    return {
      id: input.id ?? crypto.randomUUID(),
      source_product: input.source_product,
      job_type: input.job_type,
      job_id: input.job_id,
      command_id: input.command_id,
      thesis_id: input.thesis_id,
      actor_mode: "encrypted",
      actor_pseudonym: envelope.actor.pseudonym,
      encrypted_actor: envelope.actor.encryptedActor,
      actor_commitment: envelope.commitment,
      title: input.title,
      safe_summary: envelope.redacted.safeContent,
      encrypted_content: envelope.encrypted.ciphertext ?? null,
      commitment_hash: envelope.encrypted.commitmentHash,
      visibility: envelope.visibility,
      privacy_mode: envelope.privacyMode,
      privacy_tier: privacy,
      status: input.status,
      runtime_mode: runtime,
      payment_plane: input.payment_plane ?? null,
      receipt_id: input.receipt_id,
      cost_usd: isTrade ? undefined : input.cost_usd,
      local_only: true,
      cloud_synced: false,
      metadata: input.metadata ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  const envelope = createCloudSafeFeedEnvelope({ title: input.title, content: input.content, jobType: input.job_type, privacyTier: privacy, isPlatformPaid: input.payment_plane === "platform" });
  return {
    id: input.id ?? crypto.randomUUID(),
    source_product: input.source_product,
    job_type: input.job_type,
    job_id: input.job_id,
    command_id: input.command_id,
    thesis_id: input.thesis_id,
    actor_mode: "transparent",
    actor_id: input.actor_id,
    title: input.title,
    safe_summary: envelope.safeContent,
    visibility: "public",
    privacy_mode: "transparent",
    privacy_tier: privacy,
    status: input.status,
    runtime_mode: runtime,
    payment_plane: input.payment_plane ?? null,
    receipt_id: input.receipt_id,
    cost_usd: input.cost_usd,
    sponsor_metadata: envelope.isAd ? { sponsored: true, paymentTransparent: true } : undefined,
    local_only: false,
    cloud_synced: true,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function filterFeedItems(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  let result = items;
  if (filter.productId) result = result.filter((i) => i.source_product === filter.productId);
  if (filter.jobType) result = result.filter((i) => i.job_type === filter.jobType);
  if (filter.status) result = result.filter((i) => i.status === filter.status);
  if (filter.visibility) result = result.filter((i) => i.visibility === filter.visibility);
  if (filter.privacyTier) result = result.filter((i) => i.privacy_tier === filter.privacyTier);
  if (filter.localOnly !== undefined) result = result.filter((i) => i.local_only === filter.localOnly);
  if (filter.since) result = result.filter((i) => i.created_at >= filter.since!);
  if (filter.before) result = result.filter((i) => i.created_at < filter.before!);
  if (filter.offset !== undefined) result = result.slice(filter.offset ?? 0);
  if (filter.limit !== undefined) result = result.slice(0, filter.limit);
  return result;
}

export function createFeedEvent(input: { feed_item_id: string; event_type: FeedEvent["event_type"]; safe_message: string; status?: FeedStatus; metadata?: Record<string, unknown> }): FeedEvent {
  return { id: crypto.randomUUID(), feed_item_id: input.feed_item_id, event_type: input.event_type, status: input.status, safe_message: input.safe_message, metadata: input.metadata ?? {}, created_at: new Date().toISOString() };
}

export function createFeedSyncItem(input: { local_feed_id: string; direction: "local_to_cloud" | "cloud_to_local" }): FeedSyncItem {
  return { id: crypto.randomUUID(), local_feed_id: input.local_feed_id, sync_direction: input.direction, status: "pending", privacy_check_status: "pending", metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

export function readFeedConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: (env.UNIFIED_FEED_ENABLED ?? "true") === "true",
    defaultVisibility: env.UNIFIED_FEED_DEFAULT_VISIBILITY ?? "public",
    localEnvelopesEnabled: (env.UNIFIED_FEED_LOCAL_ENVELOPES_ENABLED ?? "true") === "true",
    realtimeEnabled: (env.UNIFIED_FEED_REALTIME_ENABLED ?? "true") === "true",
    pollIntervalMs: Number(env.UNIFIED_FEED_POLL_INTERVAL_MS ?? 5000),
    syncEnabled: (env.FEED_SYNC_ENABLED ?? "true") === "true",
    syncRequireApproval: (env.FEED_SYNC_REQUIRE_APPROVAL_FOR_PRIVATE ?? "true") === "true",
    syncLocalEnvelopesAllowed: (env.FEED_SYNC_ALLOW_LOCAL_ENVELOPES ?? "true") === "true"
  };
}
