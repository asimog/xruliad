import {
  createCloudServerClient,
  type SupabaseClientConfig,
  isForbiddenClass,
} from "./index.js";

export function getSupabaseConfig(): SupabaseClientConfig {
  return createCloudServerClient();
}

export async function pingSupabase(): Promise<boolean> {
  try {
    const config = getSupabaseConfig();
    return Boolean(config.url);
  } catch {
    return false;
  }
}

export type PersistOk<T> = { ok: true; data: T };
export type PersistError = { ok: false; error: string; code: "not_configured" | "forbidden" | "insert_failed" | "select_failed" };
export type PersistResult<T> = PersistOk<T> | PersistError;

function requireSupabase(): PersistError | null {
  try {
    const config = getSupabaseConfig();
    if (!config.url) return { ok: false, error: "SUPABASE_URL not configured", code: "not_configured" };
    return null;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), code: "not_configured" };
  }
}

function guardForbidden(dataClass: string): PersistError | null {
  if (isForbiddenClass(dataClass)) {
    return { ok: false, error: `Cannot persist ${dataClass}: forbidden data class`, code: "forbidden" };
  }
  return null;
}

const FORBIDDEN_SECRET_FIELDS = [
  "privateKey", "secretKey", "walletPrivateKey",
  "exchangeApiSecret", "payShWalletPrivateKey",
  "seedPhrase", "mnemonic", "rawPrivateStrategy"
];

export function detectForbiddenSecretFields(input: Record<string, unknown>): string[] {
  return FORBIDDEN_SECRET_FIELDS.filter((field) => field in input && input[field] !== undefined && input[field] !== null && input[field] !== "");
}

export function assertCloudSafePayload(input: Record<string, unknown>): void {
  const forbidden = detectForbiddenSecretFields(input);
  if (forbidden.length > 0) {
    throw new Error(`Cannot persist payload containing forbidden secret fields: ${forbidden.join(", ")}`);
  }
}

const uid = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

// ── Jobs ──

export type JobRecord = {
  id: string;
  product_id: string;
  tool_id: string;
  status: string;
  input?: unknown;
  output?: unknown;
  created_at: string;
  updated_at: string;
};

export async function createJob(input: {
  productId: string;
  toolId: string;
  status?: string;
  input?: unknown;
}): Promise<PersistResult<JobRecord>> {
  const errored = requireSupabase() ?? guardForbidden("jobs");
  if (errored) return errored;
  const job: JobRecord = {
    id: uid(),
    product_id: input.productId,
    tool_id: input.toolId,
    status: input.status ?? "queued",
    input: input.input,
    output: undefined,
    created_at: now(),
    updated_at: now()
  };
  return { ok: true, data: job };
}

export async function getJob(id: string): Promise<PersistResult<JobRecord>> {
  const errored = requireSupabase() ?? guardForbidden("jobs");
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id,
      product_id: "unknown",
      tool_id: "unknown",
      status: "queued",
      created_at: now(),
      updated_at: now()
    }
  };
}

export async function updateJob(
  id: string,
  updates: Partial<Pick<JobRecord, "status" | "output">>
): Promise<PersistResult<JobRecord>> {
  const errored = requireSupabase() ?? guardForbidden("jobs");
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id,
      product_id: "unknown",
      tool_id: "unknown",
      status: updates.status ?? "running",
      created_at: now(),
      updated_at: now()
    }
  };
}

// ── Feed Items ──

export type FeedItemRecord = {
  id: string;
  source_product: string;
  job_type: string;
  title: string;
  safe_summary: string;
  status: string;
  visibility: string;
  runtime_mode: string;
  privacy_tier: string;
  created_at: string;
};

export async function createFeedItem(input: {
  sourceProduct: string;
  jobType: string;
  title: string;
  safeSummary?: string;
  status?: string;
  visibility?: string;
  runtimeMode?: string;
  privacyTier?: string;
}): Promise<PersistResult<FeedItemRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      source_product: input.sourceProduct,
      job_type: input.jobType,
      title: input.title,
      safe_summary: input.safeSummary ?? input.title,
      status: input.status ?? "queued",
      visibility: input.visibility ?? "public",
      runtime_mode: input.runtimeMode ?? "web",
      privacy_tier: input.privacyTier ?? "public",
      created_at: now()
    }
  };
}

export type FeedEventRecord = {
  id: string;
  feed_item_id: string;
  event_type: string;
  safe_message: string;
  status?: string;
  created_at: string;
};

export async function createFeedEvent(input: {
  feedItemId: string;
  eventType: string;
  safeMessage: string;
  status?: string;
}): Promise<PersistResult<FeedEventRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      feed_item_id: input.feedItemId,
      event_type: input.eventType,
      safe_message: input.safeMessage,
      status: input.status,
      created_at: now()
    }
  };
}

// ── Payments ──

export type PaymentReceiptRecord = {
  id: string;
  payment_plane: "platform" | "user_local";
  product_id: string;
  action: string;
  provider: string;
  estimated_cost_usd: number;
  currency: string;
  status: string;
  receipt_id?: string;
  created_at: string;
};

export async function createPaymentReceipt(input: {
  paymentPlane: "platform" | "user_local";
  productId: string;
  action: string;
  provider?: string;
  estimatedCostUsd?: number;
  currency?: string;
}): Promise<PersistResult<PaymentReceiptRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      payment_plane: input.paymentPlane,
      product_id: input.productId,
      action: input.action,
      provider: input.provider ?? "pay.sh",
      estimated_cost_usd: input.estimatedCostUsd ?? 0,
      currency: input.currency ?? "USDC",
      status: "quoted",
      receipt_id: undefined,
      created_at: now()
    }
  };
}

// ── Inference Receipts ──

export type InferenceReceiptRecord = {
  id: string;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
};

export async function createInferenceReceipt(input: {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}): Promise<PersistResult<InferenceReceiptRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      model: input.model,
      provider: input.provider,
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      total_tokens: input.promptTokens + input.completionTokens,
      cost_usd: input.costUsd,
      created_at: now()
    }
  };
}

// ── Moderation ──

export type ModerationActionRecord = {
  id: string;
  action: "approve" | "reject" | "hide" | "flag";
  target_type: string;
  target_id: string;
  reason?: string;
  created_at: string;
};

export async function createModerationAction(input: {
  action: "approve" | "reject" | "hide" | "flag";
  targetType: string;
  targetId: string;
  reason?: string;
}): Promise<PersistResult<ModerationActionRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      created_at: now()
    }
  };
}

// ── Display Artifacts ──

export type DisplayArtifactRecord = {
  id: string;
  job_id: string;
  artifact_type: string;
  url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export async function createDisplayArtifact(input: {
  jobId: string;
  artifactType: string;
  url?: string;
  metadata?: Record<string, unknown>;
}): Promise<PersistResult<DisplayArtifactRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      job_id: input.jobId,
      artifact_type: input.artifactType,
      url: input.url,
      metadata: input.metadata,
      created_at: now()
    }
  };
}

// ── Wallet Spawn Intents ──

export type WalletSpawnIntentRecord = {
  id: string;
  wallet_type: string;
  network: string;
  status: string;
  created_at: string;
};

export async function createWalletSpawnIntent(input: {
  walletType?: string;
  network?: string;
}): Promise<PersistResult<WalletSpawnIntentRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      wallet_type: input.walletType ?? "solana",
      network: input.network ?? "devnet",
      status: "intent_created",
      created_at: now()
    }
  };
}

// ── Beliefs ──

export type BeliefRecord = {
  id: string;
  domain: string;
  title: string;
  initial_confidence: number;
  current_confidence: number;
  visibility: string;
  source_product: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function createBeliefRecord(input: {
  domain: string;
  title: string;
  initialConfidence: number;
  visibility: string;
  sourceProduct: string;
}): Promise<PersistResult<BeliefRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      domain: input.domain,
      title: input.title,
      initial_confidence: input.initialConfidence,
      current_confidence: input.initialConfidence,
      visibility: input.visibility,
      source_product: input.sourceProduct,
      status: "draft",
      created_at: now(),
      updated_at: now()
    }
  };
}

export type BeliefUpdateRecord = {
  id: string;
  belief_id: string;
  update_type: string;
  confidence_shift: number;
  previous_confidence: number;
  new_confidence: number;
  created_at: string;
};

export async function createBeliefUpdateRecord(input: {
  beliefId: string;
  updateType: string;
  confidenceShift: number;
  previousConfidence: number;
  newConfidence: number;
}): Promise<PersistResult<BeliefUpdateRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      belief_id: input.beliefId,
      update_type: input.updateType,
      confidence_shift: input.confidenceShift,
      previous_confidence: input.previousConfidence,
      new_confidence: input.newConfidence,
      created_at: now()
    }
  };
}

// ── Commands / Theses ──

export type CommandRecord = {
  id: string;
  title: string;
  status: string;
  product_id?: string;
  created_at: string;
};

export async function createCommand(input: {
  title: string;
  description?: string;
  productId?: string;
}): Promise<PersistResult<CommandRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      title: input.title,
      status: "draft",
      product_id: input.productId,
      created_at: now()
    }
  };
}

export type ThesisRecord = {
  id: string;
  title: string;
  status: string;
  product_id?: string;
  created_at: string;
};

export async function createThesis(input: {
  title: string;
  description?: string;
  productId?: string;
}): Promise<PersistResult<ThesisRecord>> {
  const errored = requireSupabase();
  if (errored) return errored;
  return {
    ok: true,
    data: {
      id: uid(),
      title: input.title,
      status: "draft",
      product_id: input.productId,
      created_at: now()
    }
  };
}
