import type { PrivacyTier } from "@hypermyths/privacy";
import type { AppRuntimeMode } from "@hypermyths/runtime";
import { normalizeFeedItem, createFeedEvent, type FeedItem } from "@hypermyths/unified-feed";
import { createLocalJobEnvelope } from "@hypermyths/feed-privacy";

export type BeliefDomain = "market" | "prediction" | "rwa" | "cancer_research" | "physics_research" | "video" | "ads" | "code" | "model_eval" | "trading_intent" | "general_intelligence";
export type BeliefStatus = "draft" | "running" | "needs_evidence" | "needs_payment" | "needs_approval" | "sealed" | "prepared" | "completed" | "failed" | "cancelled";
export type BeliefVisibility = "public" | "private" | "encrypted" | "local_only";
export type BeliefUpdateType = "evidence_added" | "counterevidence_added" | "inference_run" | "payment_executed" | "simulation_completed" | "artifact_attached" | "contribution_added" | "confidence_shift" | "status_change";

export type Belief = {
  id: string;
  commandId?: string;
  thesisId?: string;
  userId?: string;
  agentId?: string;
  domain: BeliefDomain;
  title: string;
  safeSummary: string;
  encryptedSummary?: string | null;
  visibility: BeliefVisibility;
  privacyTier: PrivacyTier;
  status: BeliefStatus;
  currentConfidence?: number;
  initialConfidence?: number;
  riskScore?: number;
  runtimeMode: AppRuntimeMode;
  sourceProduct?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BeliefUpdate = {
  id: string;
  beliefId: string;
  updateType: BeliefUpdateType;
  title: string;
  safeSummary: string;
  encryptedContent?: string | null;
  confidenceBefore?: number;
  confidenceAfter?: number;
  riskBefore?: number;
  riskAfter?: number;
  source?: string;
  modelRouteId?: string;
  paymentReceiptId?: string;
  inferenceReceiptId?: string;
  artifactId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BeliefEvidence = {
  id: string;
  beliefId: string;
  evidenceType: "supporting" | "counter";
  title: string;
  safeSummary: string;
  content?: string | null;
  encryptedContent?: string | null;
  sourceUrl?: string;
  weight: number;
  privacyTier: PrivacyTier;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BeliefFrame = {
  id: string;
  beliefId: string;
  frameIndex: number;
  title: string;
  safeSummary: string;
  confidence?: number;
  riskScore?: number;
  status: BeliefStatus;
  feedItemId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BeliefArtifact = {
  id: string;
  beliefId: string;
  artifactType: "intelligence_report" | "video_script" | "video" | "ad_concept" | "research_quest" | "simulation_report" | "code_output" | "trade_intent" | "other";
  artifactId?: string;
  storagePath?: string;
  githubPath?: string;
  publicUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BeliefContribution = {
  id: string;
  beliefId: string;
  contributor: string;
  kind: string;
  payload: unknown;
  receiptId?: string;
  createdAt: string;
};

export type BeliefInferenceInfluence = {
  provider: string;
  model: string;
  route: string;
  costUsd?: number;
  effect: "positive" | "negative" | "neutral";
};

export type BeliefPaymentInfluence = {
  amountUsd: number;
  currency: string;
  provider: string;
  plane: "platform" | "user_local";
};

export type BeliefScore = {
  confidence: number;
  risk: number;
  evidenceCount: number;
  counterEvidenceCount: number;
  updateCount: number;
  trend: "rising" | "falling" | "stable";
};

export function createBelief(input: Omit<Belief, "id" | "createdAt" | "updatedAt" | "currentConfidence" | "safeSummary"> & { safeSummary?: string }): Belief {
  const initialConf = input.initialConfidence ?? 0.5;
  return {
    ...input,
    id: crypto.randomUUID(),
    safeSummary: input.safeSummary ?? `Belief: ${input.title}`,
    currentConfidence: initialConf,
    riskScore: 0.3,
    status: input.status ?? "draft",
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function addEvidence(input: { belief: Belief; evidence: Omit<BeliefEvidence, "id" | "beliefId" | "createdAt"> }): { belief: Belief; evidence: BeliefEvidence } {
  const evidence: BeliefEvidence = { ...input.evidence, id: crypto.randomUUID(), beliefId: input.belief.id, createdAt: new Date().toISOString() };
  const updatedBelief = computeConfidence(input.belief, { type: evidence.evidenceType, weight: evidence.weight });
  return { belief: updatedBelief, evidence };
}

export function createBeliefUpdate(input: { beliefId: string; updateType: BeliefUpdateType; title: string; safeSummary: string; confidenceBefore?: number; confidenceAfter?: number; source?: string; paymentReceiptId?: string; inferenceReceiptId?: string; artifactId?: string }): BeliefUpdate {
  return {
    id: crypto.randomUUID(),
    beliefId: input.beliefId,
    updateType: input.updateType,
    title: input.title,
    safeSummary: input.safeSummary,
    confidenceBefore: input.confidenceBefore,
    confidenceAfter: input.confidenceAfter,
    source: input.source,
    paymentReceiptId: input.paymentReceiptId,
    inferenceReceiptId: input.inferenceReceiptId,
    artifactId: input.artifactId,
    metadata: {},
    createdAt: new Date().toISOString()
  };
}

export function computeConfidence(belief: Belief, change: { type: "supporting" | "counter"; weight: number }): Belief {
  const current = belief.currentConfidence ?? belief.initialConfidence ?? 0.5;
  const delta = change.type === "supporting" ? change.weight * 0.1 : -change.weight * 0.1;
  const newConfidence = Math.max(0, Math.min(1, current + delta));
  return { ...belief, currentConfidence: newConfidence, riskScore: Math.max(0, Math.min(1, (belief.riskScore ?? 0.3) + (change.type === "counter" ? 0.05 : -0.02))), updatedAt: new Date().toISOString() };
}

export function computeBeliefScore(belief: Belief, evidenceCount: number, counterEvidenceCount: number, updateCount: number): BeliefScore {
  const conf = belief.currentConfidence ?? 0.5;
  const prevConf = belief.initialConfidence ?? 0.5;
  return {
    confidence: conf,
    risk: belief.riskScore ?? 0.3,
    evidenceCount,
    counterEvidenceCount,
    updateCount,
    trend: conf > prevConf + 0.05 ? "rising" : conf < prevConf - 0.05 ? "falling" : "stable"
  };
}

export function explainBeliefChange(before: number, after: number, reason: string): string {
  const delta = after - before;
  const direction = delta > 0.01 ? "increased" : delta < -0.01 ? "decreased" : "held steady";
  return `Confidence ${direction} (${(before * 100).toFixed(0)}% → ${(after * 100).toFixed(0)}%) — ${reason}`;
}

export function createBeliefFrame(input: { belief: Belief; frameIndex: number; updateType?: BeliefUpdateType; feedItemId?: string }): BeliefFrame {
  return {
    id: crypto.randomUUID(),
    beliefId: input.belief.id,
    frameIndex: input.frameIndex,
    title: `${input.belief.title} — Frame ${input.frameIndex}`,
    safeSummary: input.updateType ? `Updated: ${input.updateType}` : `Belief created: ${input.belief.title}`,
    confidence: input.belief.currentConfidence,
    riskScore: input.belief.riskScore,
    status: input.belief.status,
    feedItemId: input.feedItemId,
    metadata: { updateType: input.updateType },
    createdAt: new Date().toISOString()
  };
}

export function createBeliefArtifact(input: Omit<BeliefArtifact, "id" | "createdAt">): BeliefArtifact {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function createPublicSafeSummary(belief: Belief, score: BeliefScore): string {
  return `${belief.title} — Confidence: ${(score.confidence * 100).toFixed(0)}% — ${score.evidenceCount} evidence / ${score.counterEvidenceCount} counter — Trend: ${score.trend}`;
}

export function attachInferenceToBelief(belief: Belief, inference: BeliefInferenceInfluence): { belief: Belief; update: BeliefUpdate } {
  const delta = inference.effect === "positive" ? 0.03 : inference.effect === "negative" ? -0.03 : 0;
  const newConf = Math.max(0, Math.min(1, (belief.currentConfidence ?? 0.5) + delta));
  const updated = { ...belief, currentConfidence: newConf, updatedAt: new Date().toISOString() };
  const update = createBeliefUpdate({ beliefId: belief.id, updateType: "inference_run", title: `Inference: ${inference.provider}/${inference.model}`, safeSummary: explainBeliefChange(belief.currentConfidence ?? 0.5, newConf, `Inference via ${inference.provider} ${inference.model}`), confidenceBefore: belief.currentConfidence, confidenceAfter: newConf, source: inference.route });
  return { belief: updated, update };
}

export function attachPaymentToBelief(belief: Belief, payment: BeliefPaymentInfluence): { belief: Belief; update: BeliefUpdate } {
  const update = createBeliefUpdate({ beliefId: belief.id, updateType: "payment_executed", title: `Payment: ${payment.amountUsd} ${payment.currency}`, safeSummary: `Paid ${payment.amountUsd} ${payment.currency} via ${payment.provider} (${payment.plane})`, source: payment.provider, paymentReceiptId: `pmt-${belief.id.slice(0, 8)}` });
  return { belief: { ...belief, status: "needs_evidence", updatedAt: new Date().toISOString() }, update };
}

export function feedItemFromBelief(belief: Belief, score: BeliefScore): { feedItem: FeedItem } {
  const summary = createPublicSafeSummary(belief, score);
  const isLocal = belief.runtimeMode === "local";

  if (isLocal) {
    const envelope = createLocalJobEnvelope({ title: belief.title, jobType: "thesis", privacyTier: belief.privacyTier, actorId: belief.userId ?? belief.agentId });
    const item = normalizeFeedItem({ source_product: belief.sourceProduct as any ?? "hypermyths", job_type: "thesis", title: belief.title, status: belief.status === "completed" ? "complete" : "running", runtime_mode: "local", privacy_tier: belief.privacyTier, local_only: true, command_id: belief.commandId, thesis_id: belief.thesisId, actor_id: belief.userId });
    return { feedItem: { ...item, safe_summary: summary } };
  }

  const item = normalizeFeedItem({ source_product: belief.sourceProduct as any ?? "hypermyths", job_type: "thesis", title: belief.title, status: belief.status === "completed" ? "complete" : "running", runtime_mode: "web", privacy_tier: belief.privacyTier, command_id: belief.commandId, thesis_id: belief.thesisId, actor_id: belief.userId, content: summary });
  return { feedItem: item };
}

export function readBeliefConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: (env.BELIEF_ENGINE_ENABLED ?? "true") === "true",
    defaultVisibility: env.BELIEF_DEFAULT_VISIBILITY ?? "private",
    publicFeedEnabled: (env.BELIEF_PUBLIC_FEED_ENABLED ?? "true") === "true",
    rbmVisuals: (env.BELIEF_RBM_INSPIRED_VISUALS ?? "true") === "true",
    defaultConfidence: Number(env.BELIEF_CONFIDENCE_DEFAULT ?? 0.5)
  };
}
