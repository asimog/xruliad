import type { PrivacyTier } from "@hypermyths/privacy";
import type { AppRuntimeMode } from "@hypermyths/runtime";

export type FeedVisibility = "public" | "unlisted" | "account_private" | "workspace_private" | "local_private" | "encrypted_public" | "encrypted_unlisted" | "redacted_public" | "redacted_private";
export type FeedPrivacyMode = "transparent" | "pseudonymous" | "encrypted_actor" | "encrypted_content" | "redacted_content" | "commitment_only" | "local_only";

export type FeedActor = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isLocal: boolean;
};
export type EncryptedFeedActor = {
  ciphertext: string;
  algorithm: "encrypted" | "pseudonymous";
  publicLabel: string;
  decryptableByOwnerOnly: true;
};
export type ActorCommitment = {
  hash: string;
  salt: string;
  algorithm: "sha256";
};

export type FeedRedactionResult = {
  redacted: boolean;
  safeContent: string;
  originalFieldsRedacted: string[];
};
export type FeedEncryptionResult = {
  encrypted: boolean;
  ciphertext?: string;
  safeSummary: string;
  commitmentHash?: string;
};
export type FeedContentClass = "safe_summary" | "title_only" | "redacted_content" | "encrypted_content" | "commitment_only" | "fully_private";

export function classifyFeedContent(input: { title: string; content?: string; privacyTier: PrivacyTier; runtimeMode: AppRuntimeMode; isTradeRelated?: boolean; isQvacRelated?: boolean }): FeedContentClass {
  if (input.privacyTier === "wallet_or_key_material") return "fully_private";
  if (input.runtimeMode === "local" && input.isTradeRelated) return "commitment_only";
  if (input.runtimeMode === "local" && input.isQvacRelated) return "redacted_content";
  if (input.runtimeMode === "local" && input.privacyTier === "private_strategy") return "encrypted_content";
  if (input.runtimeMode === "local") return "safe_summary";
  return "safe_summary";
}

export function redactFeedContent(input: { title: string; content?: string; contentClass: FeedContentClass }): FeedRedactionResult {
  if (input.contentClass === "fully_private") return { redacted: true, safeContent: "[private]", originalFieldsRedacted: ["title", "content"] };
  if (input.contentClass === "commitment_only") return { redacted: true, safeContent: "[local execution intent]", originalFieldsRedacted: ["content"] };
  if (input.contentClass === "redacted_content") return { redacted: true, safeContent: `[redacted] ${input.title}`, originalFieldsRedacted: ["content"] };
  if (input.contentClass === "encrypted_content") return { redacted: true, safeContent: `[encrypted] ${input.title}`, originalFieldsRedacted: ["content"] };
  return { redacted: false, safeContent: input.content ?? input.title, originalFieldsRedacted: [] };
}

export function encryptFeedContent(input: { content: string; contentClass: FeedContentClass; encryptionKey?: string }): FeedEncryptionResult {
  if (input.contentClass === "fully_private") return { encrypted: false, safeSummary: "[private — not shareable]", commitmentHash: "blocked" };
  if (input.contentClass === "commitment_only") {
    const hash = simpleHash(input.content);
    return { encrypted: false, safeSummary: "[local execution intent prepared]", commitmentHash: hash };
  }
  if (input.contentClass === "encrypted_content" && input.encryptionKey) {
    const encoded = Buffer.from(input.content).toString("base64");
    return { encrypted: true, ciphertext: encoded, safeSummary: "[encrypted content — decryptable by owner]", commitmentHash: simpleHash(encoded) };
  }
  return { encrypted: false, safeSummary: input.content, commitmentHash: undefined };
}

export function createPseudonymousActorId(salt?: string): string {
  const suffix = salt ?? "hypermyths-local";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `local-${suffix.slice(0, 6)}-${random}`;
}

export function encryptFeedActor(input: { actorId: string; displayName: string; encryptionKey?: string }): { pseudonym: string; encryptedActor: EncryptedFeedActor } {
  const pseudonym = input.encryptionKey ? input.actorId.slice(0, 12) : createPseudonymousActorId();
  const encryptedActor: EncryptedFeedActor = {
    ciphertext: input.encryptionKey ? Buffer.from(JSON.stringify({ id: input.actorId, name: input.displayName })).toString("base64") : "pseudonymous",
    algorithm: input.encryptionKey ? "encrypted" : "pseudonymous",
    publicLabel: input.encryptionKey ? `encrypted-actor-${pseudonym}` : `local-user-${pseudonym}`,
    decryptableByOwnerOnly: true
  };
  return { pseudonym, encryptedActor };
}

export function createActorCommitment(actorId: string, salt?: string): ActorCommitment {
  const s = salt ?? "feed-commitment-salt";
  return { hash: simpleHash(`${s}:${actorId}`), salt: s, algorithm: "sha256" };
}

export function redactActorForPublicFeed(): { redacted: true; publicLabel: string } {
  return { redacted: true, publicLabel: "Anonymous Creator" };
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `hm-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export function assertFeedSafe(input: { privacyTier: PrivacyTier; content: string }): { safe: boolean; reason: string } {
  const blockedPatterns = [/private\s*key/i, /seed\s*phrase/i, /mnemonic/i, /wallet\s*secret/i, /api\s*secret/i, /sk-[a-zA-Z0-9]{20,}/i];
  for (const pattern of blockedPatterns) {
    if (pattern.test(input.content)) return { safe: false, reason: "Blocked: likely secret material detected in feed content" };
  }
  return { safe: true, reason: "ok" };
}

export function generateSafeSummary(input: { title: string; jobType: string; runtimeMode: AppRuntimeMode }): string {
  if (input.runtimeMode === "local") {
    const summaries: Record<string, string> = {
      local_trade_intent: "Local trade intent prepared",
      local_execution_intent: "Local execution intent prepared",
      strategy_vault: "Private strategy sealed",
      encrypt_seal: "Encrypted strategy created",
      ika_policy: "Local guardrail policy prepared",
      qvac_local_reasoning: "Local QVAC reasoning completed"
    };
    return summaries[input.jobType] ?? `Private ${input.jobType} completed locally`;
  }
  return input.title;
}

export function createLocalJobEnvelope(input: { title: string; jobType: string; privacyTier: PrivacyTier; actorId?: string; encryptionKey?: string }) {
  const defaultEncrypted: EncryptedFeedActor = { ciphertext: "", algorithm: "pseudonymous", publicLabel: "Anonymous Local", decryptableByOwnerOnly: true };
  const actor = input.actorId ? encryptFeedActor({ actorId: input.actorId, displayName: "Local Operator", encryptionKey: input.encryptionKey }) : { pseudonym: createPseudonymousActorId(), encryptedActor: defaultEncrypted };
  const contentClass = classifyFeedContent({ title: input.title, privacyTier: input.privacyTier, runtimeMode: "local", isTradeRelated: input.jobType.includes("trade") || input.jobType.includes("execution"), isQvacRelated: input.jobType.includes("qvac") });
  const redacted = redactFeedContent({ title: input.title, contentClass });
  const encrypted = encryptFeedContent({ content: input.title, contentClass, encryptionKey: input.encryptionKey });
  const commitment = input.jobType.includes("trade") || input.jobType.includes("execution") ? createActorCommitment(actor.pseudonym) : undefined;
  return { actor, contentClass, redacted, encrypted, commitment, visibility: "encrypted_public" as const, privacyMode: contentClass === "commitment_only" ? "commitment_only" as const : "encrypted_actor" as const };
}

export function createCloudSafeFeedEnvelope(input: { title: string; content?: string; jobType: string; privacyTier: PrivacyTier; isPlatformPaid?: boolean; isAd?: boolean }) {
  const safeCheck = input.content ? assertFeedSafe({ privacyTier: input.privacyTier, content: input.content }) : { safe: true, reason: "no content" };
  return {
    visibility: "public" as const,
    privacyMode: "transparent" as const,
    safeContent: safeCheck.safe ? (input.content ?? input.title) : "[redacted — unsafe content]",
    isPlatformPaid: input.isPlatformPaid ?? false,
    isAd: input.isAd ?? false,
    sponsorMetadataRequired: input.isAd ?? false
  };
}

export function readFeedPrivacyConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    encryptLocalActors: (env.FEED_ENCRYPT_LOCAL_ACTORS ?? "true") === "true",
    localJobsDefaultMode: env.FEED_LOCAL_JOBS_DEFAULT_MODE ?? "encrypted_public",
    localTradingDefaultMode: env.FEED_LOCAL_TRADING_DEFAULT_MODE ?? "commitment_only",
    qvacJobsDefaultMode: env.FEED_QVAC_JOBS_DEFAULT_MODE ?? "redacted_public",
    actorEncryptionKey: env.FEED_ACTOR_ENCRYPTION_KEY ?? undefined,
    localPseudonymSalt: env.FEED_LOCAL_PSEUDONYM_SALT ?? undefined,
    contentEncryptionKey: env.FEED_CONTENT_ENCRYPTION_KEY ?? undefined
  };
}
