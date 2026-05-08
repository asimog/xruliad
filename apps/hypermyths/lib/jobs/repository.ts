import { db, Prisma } from "@/lib/db";
import { assertTransition } from "@/lib/jobs/state-machine";
import { getPackageConfig } from "@/lib/packages";
import {
  type InternalVideoRenderDocument,
  type JobDocument,
  type JobProgress,
  type JobStatus,
  type PackageType,
  type PumpMetadataCacheDocument,
  type ReportDocument,
  type SupportedTokenChain,
  type VideoStyleId,
  type VideoDocument,
} from "@/lib/types/domain";
import { randomUUID } from "crypto";

function nowIso(): string {
  return new Date().toISOString();
}

const VALID_CINEMA_EXPERIENCES = new Set<
  NonNullable<JobDocument["experience"]>
>([
  "legacy",
  "hypercinema",
  "two_act_cinema",
  "hyperm",
  "mythx",
  "trenchcinema",
  "funcinema",
  "familycinema",
  "musicvideo",
  "recreator",
  "hashmyth",
  "lovex",
]);

const EXPERIENCE_AUDIO_DEFAULTS: Partial<
  Record<NonNullable<JobDocument["experience"]>, boolean>
> = {
  legacy: false,
  hypercinema: false,
  two_act_cinema: false,
  hyperm: true,
  mythx: true,
  trenchcinema: true,
  funcinema: true,
  familycinema: true,
  musicvideo: true,
  recreator: true,
  hashmyth: true,
  lovex: true,
};

function isCinemaExperience(
  value: unknown,
): value is NonNullable<JobDocument["experience"]> {
  return (
    typeof value === "string" &&
    VALID_CINEMA_EXPERIENCES.has(
      value as NonNullable<JobDocument["experience"]>,
    )
  );
}

function resolveExperience(input: {
  experience?: JobDocument["experience"];
  requestKind?: JobDocument["requestKind"];
  visibility?: JobDocument["visibility"];
}): JobDocument["experience"] {
  if (isCinemaExperience(input.experience)) {
    return input.experience;
  }

  if (input.requestKind === "token_video") {
    return "hashmyth";
  }

  if (input.requestKind === "token_scan") {
    return "hyperm";
  }

  if (
    input.experience === "two_act_cinema" ||
    input.experience === "three_act_cinema"
  ) {
    return "two_act_cinema";
  }

  if (input.requestKind === "mythx") {
    return "mythx";
  }

  if (input.requestKind === "bedtime_story") {
    return "familycinema";
  }

  if (input.requestKind === "music_video") {
    return "musicvideo";
  }

  if (input.requestKind === "scene_recreation") {
    return "recreator";
  }

  if (input.requestKind === "generic_cinema") {
    return input.visibility === "private" ? "funcinema" : "hyperm";
  }

  return "legacy";
}

function resolveAudioEnabled(input: {
  audioEnabled?: boolean | null;
  requestKind?: JobDocument["requestKind"];
  experience?: JobDocument["experience"];
}): boolean {
  if (typeof input.audioEnabled === "boolean") {
    return input.audioEnabled;
  }

  if (isCinemaExperience(input.experience)) {
    const byExperience = EXPERIENCE_AUDIO_DEFAULTS[input.experience];
    if (typeof byExperience === "boolean") {
      return byExperience;
    }
  }

  if (input.requestKind === "token_video" || input.requestKind === "mythx") {
    return true;
  }

  if (
    input.requestKind === "bedtime_story" ||
    input.requestKind === "music_video" ||
    input.requestKind === "scene_recreation"
  ) {
    return true;
  }

  return false;
}

function resolvePackagePricing(input: {
  packageType: PackageType;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
}) {
  const pkg = getPackageConfig(input.packageType);
  return {
    packageType: pkg.packageType,
    rangeDays: input.rangeDays ?? pkg.rangeDays,
    priceSol: input.priceSol ?? pkg.priceSol,
    priceUsdc: input.priceUsdc ?? pkg.priceUsdc,
    videoSeconds: input.videoSeconds ?? pkg.videoSeconds,
  };
}

function buildJobDocument(input: {
  jobId: string;
  wallet: string;
  requestKind: JobDocument["requestKind"];
  packageType: PackageType;
  rangeDays: number;
  priceSol: number;
  priceUsdc: number;
  videoSeconds: number;
  status: JobStatus;
  progress: JobProgress;
  wallet_field?: string;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  subjectAddress?: string | null;
  subjectChain?: SupportedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  sourceMediaUrl?: string | null;
  sourceEmbedUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  stylePreset?: VideoStyleId | null;
  sceneCount?: number | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  paymentWaived?: boolean;
  initialStatus?: JobStatus;
  initialProgress?: JobProgress;
}): JobDocument {
  const createdAt = nowIso();
  const experience = resolveExperience({
    experience: input.experience,
    requestKind: input.requestKind,
    visibility: input.visibility ?? "public",
  });
  return {
    jobId: input.jobId,
    wallet: input.wallet,
    requestKind: input.requestKind,
    pricingMode: input.pricingMode ?? "public",
    visibility: input.visibility ?? "public",
    experience,
    moderationStatus: "visible",
    creatorId: input.creatorId ?? null,
    creatorEmail: input.creatorEmail ?? null,
    subjectAddress: input.subjectAddress ?? undefined,
    subjectChain: input.subjectChain ?? null,
    subjectName: input.subjectName ?? null,
    subjectSymbol: input.subjectSymbol ?? null,
    subjectImage: input.subjectImage ?? null,
    subjectDescription: input.subjectDescription ?? null,
    sourceMediaUrl: input.sourceMediaUrl ?? null,
    sourceEmbedUrl: input.sourceEmbedUrl ?? null,
    sourceMediaProvider: input.sourceMediaProvider ?? null,
    sourceTranscript: input.sourceTranscript ?? null,
    stylePreset: input.stylePreset ?? null,
    sceneCount: input.sceneCount ?? null,
    requestedPrompt: input.requestedPrompt ?? null,
    audioEnabled: resolveAudioEnabled({
      audioEnabled: input.audioEnabled,
      requestKind: input.requestKind,
      experience,
    }),
    packageType: input.packageType,
    rangeDays: input.rangeDays,
    priceSol: input.priceSol,
    priceUsdc: input.priceUsdc,
    videoSeconds: input.videoSeconds,
    status: input.initialStatus ?? input.status,
    progress: input.initialProgress ?? input.progress,
    txSignature: null,
    createdAt,
    updatedAt: createdAt,
    errorCode: null,
    errorMessage: null,
    paymentWaived: input.paymentWaived ?? false,
    discountCode: null,
  };
}

function jobCreateData(job: JobDocument) {
  return {
    jobId: job.jobId,
    wallet: job.wallet,
    requestKind: job.requestKind,
    pricingMode: job.pricingMode,
    visibility: job.visibility,
    experience: job.experience,
    moderationStatus: job.moderationStatus,
    creatorId: job.creatorId,
    creatorEmail: job.creatorEmail,
    subjectAddress: job.subjectAddress,
    subjectChain: job.subjectChain,
    subjectName: job.subjectName,
    subjectSymbol: job.subjectSymbol,
    subjectImage: job.subjectImage,
    subjectDescription: job.subjectDescription,
    sourceMediaUrl: job.sourceMediaUrl,
    sourceEmbedUrl: job.sourceEmbedUrl,
    sourceMediaProvider: job.sourceMediaProvider,
    sourceTranscript: job.sourceTranscript,
    stylePreset: job.stylePreset,
    sceneCount: job.sceneCount ?? null,
    requestedPrompt: job.requestedPrompt,
    audioEnabled: job.audioEnabled,
    packageType: job.packageType,
    rangeDays: job.rangeDays,
    priceSol: job.priceSol,
    priceUsdc: job.priceUsdc,
    videoSeconds: job.videoSeconds,
    status: job.status,
    progress: job.progress,
    txSignature: job.txSignature,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    paymentWaived: job.paymentWaived,
    discountCode: job.discountCode,
    paymentMethod: job.paymentMethod,
    paymentCurrency: job.paymentCurrency,
    paymentNetwork: job.paymentNetwork,
    x402Transaction: job.x402Transaction,
    paymentAddress: job.paymentAddress ?? "none",
    paymentRouting: job.paymentRouting ?? "legacy_memo",
    requiredLamports: job.requiredLamports ?? BigInt(0),
    receivedLamports: job.receivedLamports ?? BigInt(0),
    paymentSignatures: job.paymentSignatures as Prisma.InputJsonValue | undefined,
    lastPaymentAt: job.lastPaymentAt ? new Date(job.lastPaymentAt) : undefined,
    sweepStatus: job.sweepStatus ?? "pending",
    sweepSignature: job.sweepSignature,
    sweptLamports: job.sweptLamports ?? BigInt(0),
    lastSweepAt: job.lastSweepAt ? new Date(job.lastSweepAt) : undefined,
    sweepError: job.sweepError,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.createdAt),
  };
}

type DbJobRow = NonNullable<Awaited<ReturnType<typeof db.job.findUnique>>>;
type DbVideoRow = NonNullable<Awaited<ReturnType<typeof db.video.findUnique>>>;

type DispatchOutboxRow = NonNullable<
  Awaited<ReturnType<typeof db.jobDispatchOutbox.findUnique>>
>;

function normalizeJob(doc: DbJobRow): JobDocument {
  const rawStatus = (doc.status ?? "pending").toLowerCase();
  const rawProgress = (doc.progress ?? "pending").toLowerCase();
  const normalizedStatus: JobStatus =
    rawStatus === "done"
      ? "complete"
      : rawStatus === "awaiting_payment" ||
          rawStatus === "payment_confirmed" ||
          rawStatus === "pending" ||
          rawStatus === "processing" ||
          rawStatus === "complete" ||
          rawStatus === "failed"
        ? (rawStatus as JobStatus)
        : "pending";
  const normalizedProgress: JobProgress =
    rawProgress === "done"
      ? "complete"
      : rawProgress === "awaiting_payment" ||
          rawProgress === "payment_confirmed" ||
          rawProgress === "pending" ||
          rawProgress === "fetching_transactions" ||
          rawProgress === "filtering_pump_activity" ||
          rawProgress === "generating_report" ||
          rawProgress === "generating_script" ||
          rawProgress === "generating_video" ||
          rawProgress === "rendering_scenes" ||
          rawProgress === "rendering_scene_1" ||
          rawProgress === "rendering_scene_2" ||
          rawProgress === "rendering_scene_3" ||
          rawProgress === "stitching_video" ||
          rawProgress === "uploading_assets" ||
          rawProgress === "complete" ||
          rawProgress === "failed"
        ? (rawProgress as JobProgress)
        : "pending";

  return {
    jobId: doc.jobId,
    wallet: doc.wallet,
    requestKind: (doc.requestKind ?? undefined) as JobDocument["requestKind"],
    pricingMode: (doc.pricingMode ?? undefined) as JobDocument["pricingMode"],
    visibility: (doc.visibility ?? undefined) as JobDocument["visibility"],
    experience: isCinemaExperience(doc.experience) ? doc.experience : undefined,
    moderationStatus: (doc.moderationStatus ??
      undefined) as JobDocument["moderationStatus"],
    creatorId: doc.creatorId,
    creatorEmail: doc.creatorEmail,
    subjectAddress: doc.subjectAddress ?? undefined,
    subjectChain: (doc.subjectChain ?? null) as JobDocument["subjectChain"],
    subjectName: doc.subjectName,
    subjectSymbol: doc.subjectSymbol,
    subjectImage: doc.subjectImage,
    subjectDescription: doc.subjectDescription,
    sourceMediaUrl: doc.sourceMediaUrl,
    sourceEmbedUrl: doc.sourceEmbedUrl,
    sourceMediaProvider: doc.sourceMediaProvider,
    sourceTranscript: doc.sourceTranscript,
    stylePreset: (doc.stylePreset ?? null) as JobDocument["stylePreset"],
    sceneCount: doc.sceneCount ?? null,
    requestedPrompt: doc.requestedPrompt,
    audioEnabled: doc.audioEnabled,
    packageType: doc.packageType as JobDocument["packageType"],
    rangeDays: doc.rangeDays,
    priceSol: doc.priceSol,
    priceUsdc: doc.priceUsdc ?? undefined,
    videoSeconds: doc.videoSeconds,
    status: normalizedStatus,
    progress: normalizedProgress,
    txSignature: doc.txSignature,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    errorCode: doc.errorCode,
    errorMessage: doc.errorMessage,
    paymentWaived: doc.paymentWaived ?? false,
    discountCode: doc.discountCode,
    paymentMethod: doc.paymentMethod,
    paymentCurrency: doc.paymentCurrency,
    paymentNetwork: doc.paymentNetwork,
    x402Transaction: doc.x402Transaction,
    paymentAddress: doc.paymentAddress,
    paymentRouting: doc.paymentRouting,
    requiredLamports: doc.requiredLamports,
    receivedLamports: doc.receivedLamports,
    paymentSignatures: doc.paymentSignatures,
    lastPaymentAt: doc.lastPaymentAt?.toISOString() ?? null,
    sweepStatus: doc.sweepStatus,
    sweepSignature: doc.sweepSignature,
    sweptLamports: doc.sweptLamports,
    lastSweepAt: doc.lastSweepAt?.toISOString() ?? null,
    sweepError: doc.sweepError,
  };
}

function normalizeVideo(doc: DbVideoRow): VideoDocument {
  const rawRenderStatus = (doc.renderStatus ?? "queued").toLowerCase();
  const normalizedRenderStatus: VideoDocument["renderStatus"] =
    rawRenderStatus === "done" || rawRenderStatus === "complete"
      ? "ready"
      : rawRenderStatus === "queued" ||
          rawRenderStatus === "processing" ||
          rawRenderStatus === "ready" ||
          rawRenderStatus === "failed"
        ? (rawRenderStatus as VideoDocument["renderStatus"])
        : "queued";

  return {
    jobId: doc.jobId,
    videoUrl: doc.videoUrl,
    thumbnailUrl: doc.thumbnailUrl,
    duration: doc.duration,
    renderStatus: normalizedRenderStatus,
  };
}

// ============================================================
// createTokenVideoJob — creates a pending job for token videos
// ============================================================
export async function createTokenVideoJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  stylePreset?: VideoStyleId | null;
  sceneCount?: number | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
  paymentWaived?: boolean;
  initialStatus?: JobStatus;
  initialProgress?: JobProgress;
  enqueueDispatch?: boolean;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();
  const job = buildJobDocument({
    jobId,
    wallet: input.tokenAddress,
    requestKind: "token_video",
    packageType: pkg.packageType,
    rangeDays: pkg.rangeDays,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "pending",
    progress: "pending",
    initialStatus: input.initialStatus,
    initialProgress: input.initialProgress,
    pricingMode: input.pricingMode ?? "legacy",
    visibility: input.visibility ?? "public",
    experience: input.experience,
    creatorId: input.creatorId ?? null,
    creatorEmail: input.creatorEmail ?? null,
    subjectAddress: input.tokenAddress,
    subjectChain: input.subjectChain,
    subjectName: input.subjectName ?? null,
    subjectSymbol: input.subjectSymbol ?? null,
    subjectImage: input.subjectImage ?? null,
    subjectDescription: input.subjectDescription ?? null,
    stylePreset: input.stylePreset ?? null,
    sceneCount: input.sceneCount ?? null,
    requestedPrompt: input.requestedPrompt ?? null,
    audioEnabled: input.audioEnabled,
    paymentWaived: input.paymentWaived,
  });

  await db.job.create({ data: jobCreateData(job) });

  if (input.enqueueDispatch ?? true) {
    await db.jobDispatchOutbox.create({
      data: {
        jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(job.createdAt),
        lockUntil: null,
        lastError: null,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.createdAt),
        dispatchedAt: null,
      },
    });
  }

  return job;
}

// ============================================================
// createPromptVideoJob — creates a pending job for prompt-based videos
// ============================================================
export async function createPromptVideoJob(input: {
  requestKind:
    | "generic_cinema"
    | "mythx"
    | "bedtime_story"
    | "music_video"
    | "scene_recreation";
  packageType: PackageType;
  subjectName: string;
  subjectImage?: string | null;
  subjectDescription?: string | null;
  sourceMediaUrl?: string | null;
  sourceEmbedUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  stylePreset?: VideoStyleId | null;
  sceneCount?: number | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
  paymentWaived?: boolean;
  initialStatus?: JobStatus;
  initialProgress?: JobProgress;
  enqueueDispatch?: boolean;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();
  const job = buildJobDocument({
    jobId,
    wallet: `${input.requestKind}:${jobId}`,
    requestKind: input.requestKind,
    packageType: pkg.packageType,
    rangeDays: pkg.rangeDays,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "pending",
    progress: "pending",
    initialStatus: input.initialStatus,
    initialProgress: input.initialProgress,
    pricingMode: input.pricingMode ?? "public",
    visibility: input.visibility ?? "public",
    experience: input.experience,
    creatorId: input.creatorId ?? null,
    creatorEmail: input.creatorEmail ?? null,
    subjectName: input.subjectName.trim(),
    subjectImage: input.subjectImage?.trim() || null,
    subjectDescription: input.subjectDescription?.trim() || null,
    sourceMediaUrl: input.sourceMediaUrl?.trim() || null,
    sourceEmbedUrl: input.sourceEmbedUrl?.trim() || null,
    sourceMediaProvider: input.sourceMediaProvider?.trim() || null,
    sourceTranscript: input.sourceTranscript?.trim() || null,
    stylePreset: input.stylePreset ?? null,
    sceneCount: input.sceneCount ?? null,
    requestedPrompt: input.requestedPrompt?.trim() || null,
    audioEnabled: input.audioEnabled,
    paymentWaived: input.paymentWaived,
  });

  await db.job.create({ data: jobCreateData(job) });

  if (input.enqueueDispatch ?? true) {
    await db.jobDispatchOutbox.create({
      data: {
        jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(job.createdAt),
        lockUntil: null,
        lastError: null,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.createdAt),
        dispatchedAt: null,
      },
    });
  }

  return job;
}

export async function createWalletRecapJob(input: {
  wallet: string;
  packageType: PackageType;
  subjectName?: string | null;
  subjectDescription?: string | null;
  requestedPrompt?: string | null;
  audioEnabled?: boolean | null;
  pricingMode?: JobDocument["pricingMode"];
  visibility?: JobDocument["visibility"];
  experience?: JobDocument["experience"];
  creatorId?: string | null;
  creatorEmail?: string | null;
  priceSol?: number;
  priceUsdc?: number;
  videoSeconds?: number;
  rangeDays?: number;
  paymentWaived?: boolean;
  initialStatus?: JobStatus;
  initialProgress?: JobProgress;
  enqueueDispatch?: boolean;
}): Promise<JobDocument> {
  const pkg = resolvePackagePricing(input);
  const jobId = randomUUID();
  const wallet = input.wallet.trim();
  const job = buildJobDocument({
    jobId,
    wallet,
    requestKind: "wallet_recap",
    packageType: pkg.packageType,
    rangeDays: input.rangeDays ?? 1,
    priceSol: pkg.priceSol,
    priceUsdc: pkg.priceUsdc,
    videoSeconds: pkg.videoSeconds,
    status: "pending",
    progress: "pending",
    initialStatus: input.initialStatus,
    initialProgress: input.initialProgress,
    pricingMode: input.pricingMode ?? "public",
    visibility: input.visibility ?? "public",
    experience: input.experience ?? "two_act_cinema",
    creatorId: input.creatorId ?? null,
    creatorEmail: input.creatorEmail ?? null,
    subjectAddress: wallet,
    subjectChain: "solana",
    subjectName: input.subjectName?.trim() || `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
    subjectDescription:
      input.subjectDescription?.trim() ||
      "A cinematic trailer generated from the last 24 hours of Solana wallet activity.",
    requestedPrompt: input.requestedPrompt?.trim() || null,
    audioEnabled: input.audioEnabled,
    paymentWaived: input.paymentWaived,
  });

  await db.job.create({ data: jobCreateData(job) });

  if (input.enqueueDispatch ?? true) {
    await db.jobDispatchOutbox.create({
      data: {
        jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(job.createdAt),
        lockUntil: null,
        lastError: null,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.createdAt),
        dispatchedAt: null,
      },
    });
  }

  return job;
}

// ============================================================
// getJob
// ============================================================
export async function getJob(jobId: string): Promise<JobDocument | null> {
  const doc = await db.job.findUnique({ where: { jobId } });
  if (!doc) return null;
  return normalizeJob(doc);
}

// ============================================================
// updateJob — partial update (persists all provided fields)
// ============================================================
export async function updateJob(
  jobId: string,
  data: Partial<JobDocument>,
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  // Status and progress
  if (data.status !== undefined) updateData.status = data.status;
  if (data.progress !== undefined) updateData.progress = data.progress;
  if (data.errorCode !== undefined) updateData.errorCode = data.errorCode;
  if (data.errorMessage !== undefined)
    updateData.errorMessage = data.errorMessage;
  if (data.txSignature !== undefined) updateData.txSignature = data.txSignature;
  if (data.paymentWaived !== undefined)
    updateData.paymentWaived = data.paymentWaived;
  if (data.discountCode !== undefined)
    updateData.discountCode = data.discountCode;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.paymentCurrency !== undefined) updateData.paymentCurrency = data.paymentCurrency;
  if (data.paymentNetwork !== undefined) updateData.paymentNetwork = data.paymentNetwork;
  if (data.x402Transaction !== undefined) updateData.x402Transaction = data.x402Transaction;
  if (data.paymentAddress !== undefined) updateData.paymentAddress = data.paymentAddress;
  if (data.paymentRouting !== undefined) updateData.paymentRouting = data.paymentRouting;
  if (data.requiredLamports !== undefined) updateData.requiredLamports = data.requiredLamports;
  if (data.receivedLamports !== undefined) updateData.receivedLamports = data.receivedLamports;
  if (data.paymentSignatures !== undefined)
    updateData.paymentSignatures = data.paymentSignatures;
  if (data.lastPaymentAt !== undefined)
    updateData.lastPaymentAt = data.lastPaymentAt ? new Date(data.lastPaymentAt) : null;
  if (data.sweepStatus !== undefined) updateData.sweepStatus = data.sweepStatus;
  if (data.sweepSignature !== undefined) updateData.sweepSignature = data.sweepSignature;
  if (data.sweptLamports !== undefined) updateData.sweptLamports = data.sweptLamports;
  if (data.lastSweepAt !== undefined)
    updateData.lastSweepAt = data.lastSweepAt ? new Date(data.lastSweepAt) : null;
  if (data.sweepError !== undefined) updateData.sweepError = data.sweepError;

  // Subject metadata (token/video info)
  if (data.subjectAddress !== undefined) updateData.subjectAddress = data.subjectAddress;
  if (data.subjectChain !== undefined) updateData.subjectChain = data.subjectChain;
  if (data.subjectName !== undefined) updateData.subjectName = data.subjectName;
  if (data.subjectSymbol !== undefined) updateData.subjectSymbol = data.subjectSymbol;
  if (data.subjectImage !== undefined) updateData.subjectImage = data.subjectImage;
  if (data.subjectDescription !== undefined) updateData.subjectDescription = data.subjectDescription;

  // Source media
  if (data.sourceMediaUrl !== undefined) updateData.sourceMediaUrl = data.sourceMediaUrl;
  if (data.sourceEmbedUrl !== undefined) updateData.sourceEmbedUrl = data.sourceEmbedUrl;
  if (data.sourceMediaProvider !== undefined) updateData.sourceMediaProvider = data.sourceMediaProvider;
  if (data.sourceTranscript !== undefined) updateData.sourceTranscript = data.sourceTranscript;

  // Always update timestamp
  updateData.updatedAt = new Date();

  await db.job.update({ where: { jobId }, data: updateData });
}

// ============================================================
// updateJobProgress — update just the progress field
// ============================================================
export async function updateJobProgress(
  jobId: string,
  progress: JobProgress,
): Promise<void> {
  await db.job.update({
    where: { jobId },
    data: { progress, updatedAt: new Date() },
  });
}

// ============================================================
// updateJobStatus — with state machine validation
// ============================================================
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra?: {
    progress?: JobProgress;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  if (job.status !== status) {
    assertTransition(job.status, status);
  }

  await updateJob(jobId, {
    status,
    progress: extra?.progress ?? (status as JobProgress),
    errorCode: extra?.errorCode ?? null,
    errorMessage: extra?.errorMessage ?? null,
  });
}

// ============================================================
// markJobFailed
// ============================================================
export async function markJobFailed(
  jobId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  if (job.status === "failed") {
    await updateJob(jobId, { errorCode, errorMessage, progress: "failed" });
    return;
  }

  if (job.status === "complete") {
    throw new Error(`Cannot mark completed job ${jobId} as failed`);
  }

  await updateJobStatus(jobId, "failed", {
    errorCode,
    errorMessage,
    progress: "failed",
  });

  // Keep Video state in sync with failed jobs so `/api/video/:jobId`
  // doesn't keep reporting "queued" after pipeline failures.
  const existingVideo = await db.video.findUnique({ where: { jobId } });
  if (existingVideo) {
    if (!existingVideo.videoUrl && existingVideo.renderStatus !== "ready") {
      await db.video.update({
        where: { jobId },
        data: {
          renderStatus: "failed",
          updatedAt: new Date(),
        },
      });
    }
    return;
  }

  await db.video.create({
    data: {
      jobId,
      duration: job.videoSeconds,
      renderStatus: "failed",
      videoUrl: null,
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

// ============================================================
// failJob — simple alias
// ============================================================
export async function failJob(jobId: string, error: string): Promise<void> {
  await markJobFailed(jobId, "job_failed", error);
}

// ============================================================
// listJobs — list jobs with optional type filter
// ============================================================
export async function listJobs(
  type?: string,
  limit: number = 50,
): Promise<JobDocument[]> {
  const docs = await db.job.findMany({
    where: type ? { requestKind: type } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return docs.map(normalizeJob);
}

// ============================================================
// deleteFailedJobs — admin cleanup helper for failed jobs only
// ============================================================
export async function deleteFailedJobs(input?: {
  limit?: number;
}): Promise<{ deletedCount: number; deletedJobIds: string[] }> {
  const limit = Math.max(1, Math.min(input?.limit ?? 25, 200));

  const failedJobs = await db.job.findMany({
    where: { status: "failed" },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { jobId: true },
  });

  const failedJobIds = failedJobs.map((job) => job.jobId);
  if (failedJobIds.length === 0) {
    return {
      deletedCount: 0,
      deletedJobIds: [],
    };
  }

  await db.$transaction([
    db.moltbookPublication.deleteMany({
      where: { jobId: { in: failedJobIds } },
    }),
    db.videoRender.deleteMany({
      where: { jobId: { in: failedJobIds } },
    }),
    db.jobDispatchOutbox.deleteMany({
      where: { jobId: { in: failedJobIds } },
    }),
    db.job.deleteMany({
      where: {
        jobId: { in: failedJobIds },
        status: "failed",
      },
    }),
  ]);

  return {
    deletedCount: failedJobIds.length,
    deletedJobIds: failedJobIds,
  };
}

// ============================================================
// getJobsByWallet — find jobs by wallet/token address
// ============================================================
export async function getJobsByWallet(
  wallet: string,
  limit: number = 10,
): Promise<JobDocument[]> {
  const docs = await db.job.findMany({
    where: { wallet },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return docs.map(normalizeJob);
}

// ============================================================
// getJobsByInput — search by subject name or address
// ============================================================
export async function getJobsByInput(
  input: string,
  limit: number = 10,
): Promise<JobDocument[]> {
  const docs = await db.job.findMany({
    where: {
      OR: [
        {
          subjectAddress: {
            contains: input,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          subjectName: {
            contains: input,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return docs.map(normalizeJob);
}

// ============================================================
// findRecentReusableTokenJob — find recent complete jobs for reuse
// ============================================================
export async function findRecentReusableTokenJob(input: {
  tokenAddress: string;
  packageType: PackageType;
  subjectChain: SupportedTokenChain;
  stylePreset?: VideoStyleId | null;
  requestedPrompt?: string | null;
  maxAgeMinutes: number;
}): Promise<JobDocument | null> {
  const cutoff = new Date(Date.now() - input.maxAgeMinutes * 60 * 1000);
  const stylePreset = input.stylePreset ?? null;
  const requestedPrompt = input.requestedPrompt?.trim() || null;
  const docs = await db.job.findMany({
    where: {
      subjectAddress: input.tokenAddress,
      subjectChain: input.subjectChain,
      packageType: input.packageType,
      stylePreset,
      requestedPrompt,
      status: "complete",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  if (docs.length === 0) return null;
  return normalizeJob(docs[0]);
}

// ============================================================
// beginJobProcessing — atomic transition to processing
// ============================================================
function getInitialProgressForJob(job: JobDocument | null): JobDocument["progress"] {
  if (!job) return "generating_report";
  return job.requestKind === "token_video"
    ? "fetching_transactions"
    : "generating_report";
}

export async function beginJobProcessing(
  jobId: string,
  options?: { staleAfterMs?: number },
): Promise<{ acquired: boolean; job: JobDocument | null }> {
  const current = await getJob(jobId);
  if (!current) return { acquired: false, job: null };

  if (current.status === "pending" || current.status === "payment_confirmed") {
    const initialProgress = getInitialProgressForJob(current);
    const claimed = await db.job.updateMany({
      where: { jobId, status: current.status },
      data: {
        status: "processing",
        progress: initialProgress,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });

    if (claimed.count === 1) {
      const updated = await getJob(jobId);
      return { acquired: true, job: updated };
    }

    const raced = await getJob(jobId);
    return { acquired: false, job: raced };
  }

  if (current.status === "processing") {
    const updatedAtMs = Date.parse(current.updatedAt);
    const staleAfterMs = options?.staleAfterMs ?? 300_000;
    const isFresh =
      Number.isFinite(updatedAtMs) &&
      Date.now() - updatedAtMs < staleAfterMs;

    if (!isFresh) {
      return await beginJobProcessingStale(jobId);
    }
  }

  return { acquired: false, job: current };
}

// Helper for stale job reclaim — uses optimistic lock on updatedAt to prevent
// two workers both claiming the same stale job if they race to this path.
async function beginJobProcessingStale(
  jobId: string,
): Promise<{ acquired: boolean; job: JobDocument | null }> {
  const current = await getJob(jobId);
  if (!current) return { acquired: false, job: null };
  const initialProgress = getInitialProgressForJob(current);

  const result = await db.job.updateMany({
    where: {
      jobId,
      status: "processing",
      updatedAt: new Date(current.updatedAt),
    },
    data: {
      status: "processing", // keep processing but refresh timestamp
      progress: initialProgress,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    },
  });

  if (result.count === 0) {
    const current = await getJob(jobId);
    return { acquired: false, job: current };
  }

  const updated = await getJob(jobId);
  return { acquired: true, job: updated };
}

// ============================================================
// prepareFailedJobForRetry — reset failed job to pending
// ============================================================
export async function prepareFailedJobForRetry(jobId: string): Promise<{
  status: "ready" | "job_not_found" | "job_not_failed" | "already_processing";
  job: JobDocument | null;
}> {
  const job = await getJob(jobId);
  if (!job) return { status: "job_not_found", job: null };
  if (job.status !== "failed") return { status: "job_not_failed", job };

  const retryClaim = await db.job.updateMany({
    where: { jobId, status: "failed" },
    data: {
      status: "pending",
      progress: "pending",
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    },
  });
  if (retryClaim.count !== 1) {
    const current = await getJob(jobId);
    return {
      status: current?.status === "processing" ? "already_processing" : "job_not_failed",
      job: current,
    };
  }

  // Reset dispatch outbox
  const now = nowIso();
  await db.jobDispatchOutbox.upsert({
    where: { jobId },
    create: {
      jobId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(now),
      lockUntil: null,
      lastError: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      dispatchedAt: null,
    },
    update: {
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(now),
      lockUntil: null,
      lastError: null,
      updatedAt: new Date(now),
      dispatchedAt: null,
    },
  });

  const updated = await getJob(jobId);
  return { status: "ready", job: updated };
}

export async function claimJobRecoveryLock(
  jobId: string,
  lockMs = 300_000,
): Promise<boolean> {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + lockMs);

  const refreshed = await db.jobRecoveryLock.updateMany({
    where: {
      jobId,
      lockUntil: { lte: now },
    },
    data: {
      lockUntil,
      updatedAt: now,
    },
  });
  if (refreshed.count === 1) return true;

  const existing = await db.jobRecoveryLock.findUnique({ where: { jobId } });
  if (existing) return false;

  try {
    await db.jobRecoveryLock.create({
      data: {
        jobId,
        lockUntil,
        createdAt: now,
        updatedAt: now,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseJobRecoveryLock(jobId: string): Promise<void> {
  await db.jobRecoveryLock.delete({ where: { jobId } }).catch(() => undefined);
}

// ============================================================
// getJobArtifacts — get job + report + video together
// ============================================================
export async function getJobArtifacts(jobId: string): Promise<{
  job: JobDocument | null;
  report: ReportDocument | null;
  video: VideoDocument | null;
}> {
  const [jobDoc, reportDoc, videoDoc] = await db.$transaction(
    [
      db.job.findUnique({ where: { jobId } }),
      db.report.findUnique({ where: { jobId } }),
      db.video.findUnique({ where: { jobId } }),
    ],
  );

  return {
    job: jobDoc ? normalizeJob(jobDoc) : null,
    report: reportDoc ? (reportDoc as unknown as ReportDocument) : null,
    video: videoDoc ? normalizeVideo(videoDoc) : null,
  };
}

// ============================================================
// getReport
// ============================================================
export async function getReport(jobId: string): Promise<ReportDocument | null> {
  const doc = await db.report.findUnique({ where: { jobId } });
  if (!doc) return null;
  return doc as unknown as ReportDocument;
}

// ============================================================
// getVideo
// ============================================================
export async function getVideo(jobId: string): Promise<VideoDocument | null> {
  const doc = await db.video.findUnique({ where: { jobId } });
  if (!doc) return null;
  return normalizeVideo(doc);
}

// ============================================================
// getInternalVideoRender
// ============================================================
export async function getInternalVideoRender(
  jobId: string,
): Promise<InternalVideoRenderDocument | null> {
  const doc = await db.videoRender.findUnique({ where: { jobId } });
  if (!doc) return null;
  return {
    id: doc.id,
    jobId: doc.jobId,
    status: doc.status as InternalVideoRenderDocument["status"],
    renderStatus:
      doc.renderStatus as InternalVideoRenderDocument["renderStatus"],
    videoUrl: doc.videoUrl,
    thumbnailUrl: doc.thumbnailUrl,
    error: doc.error,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    startedAt: doc.startedAt?.toISOString() ?? null,
    completedAt: doc.completedAt?.toISOString() ?? null,
  };
}

// ============================================================
// upsertReport
// ============================================================
export async function upsertReport(report: ReportDocument): Promise<void> {
  const data = report as unknown as Prisma.ReportUncheckedCreateInput;

  await db.report.upsert({
    where: { jobId: report.jobId },
    create: data,
    update: data,
  });
}

// ============================================================
// upsertVideo
// ============================================================
export async function upsertVideo(video: VideoDocument): Promise<void> {
  const data = video as unknown as Prisma.VideoUncheckedCreateInput;

  await db.video.upsert({
    where: { jobId: video.jobId },
    create: data,
    update: data,
  });
}

// ============================================================
// Pump metadata cache
// ============================================================
export async function getPumpMetadata(
  mint: string,
): Promise<PumpMetadataCacheDocument | null> {
  const doc = await db.pumpMetadataCache.findUnique({ where: { mint } });
  if (!doc) return null;
  return doc as unknown as PumpMetadataCacheDocument;
}

export async function upsertPumpMetadata(
  metadata: PumpMetadataCacheDocument,
): Promise<void> {
  const data = metadata as unknown as Prisma.PumpMetadataCacheUncheckedCreateInput;

  await db.pumpMetadataCache.upsert({
    where: { mint: metadata.mint },
    create: data,
    update: data,
  });
}

// ============================================================
// Moderation
// ============================================================
export async function updateJobModeration(
  jobId: string,
  moderationStatus: "visible" | "flagged" | "hidden",
): Promise<void> {
  await db.job.update({
    where: { jobId },
    data: { moderationStatus, updatedAt: new Date() },
  });
}

export async function listModerationJobArtifacts(limit: number = 50): Promise<
  Array<{
    job: JobDocument;
    report: ReportDocument | null;
    video: VideoDocument | null;
  }>
> {
  const jobs = await db.job.findMany({
    where: { moderationStatus: "flagged" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      report: true,
      video: true,
    },
  });

  return jobs.map((jobDoc) => ({
    job: normalizeJob(jobDoc),
    report: jobDoc.report as unknown as ReportDocument | null,
    video: jobDoc.video as unknown as VideoDocument | null,
  }));
}

// ============================================================
// Completed job artifacts listing
// ============================================================
export async function listCompletedJobArtifacts(
  limit: number = 50,
): Promise<
  Array<{ job: JobDocument; report: ReportDocument; video: VideoDocument }>
> {
  const jobs = await db.job.findMany({
    where: { status: "complete", visibility: "public" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      report: true,
      video: true,
    },
  });

  return jobs.flatMap((jobDoc) => {
    if (!jobDoc.report || !jobDoc.video) {
      return [];
    }

    return [
      {
        job: normalizeJob(jobDoc),
        report: jobDoc.report as unknown as ReportDocument,
        video: jobDoc.video as unknown as VideoDocument,
      },
    ];
  });
}

export async function listCompletedJobArtifactsByWallet(
  wallet: string,
  limit: number = 50,
): Promise<
  Array<{ job: JobDocument; report: ReportDocument; video: VideoDocument }>
> {
  const jobs = await db.job.findMany({
    where: { status: "complete", wallet },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      report: true,
      video: true,
    },
  });

  return jobs.flatMap((jobDoc) => {
    if (!jobDoc.report || !jobDoc.video) {
      return [];
    }

    return [
      {
        job: normalizeJob(jobDoc),
        report: jobDoc.report as unknown as ReportDocument,
        video: jobDoc.video as unknown as VideoDocument,
      },
    ];
  });
}

export async function listCompletedPrivateJobArtifactsByCreator(
  creatorId: string,
  limit: number = 50,
): Promise<
  Array<{
    job: JobDocument;
    report: ReportDocument | null;
    video: VideoDocument | null;
  }>
> {
  const jobs = await db.job.findMany({
    where: { status: "complete", creatorId, visibility: "private" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      report: true,
      video: true,
    },
  });

  return jobs.map((jobDoc) => ({
    job: normalizeJob(jobDoc),
    report: jobDoc.report as unknown as ReportDocument | null,
    video: jobDoc.video as unknown as VideoDocument | null,
  }));
}

// ============================================================
// Dispatch outbox helpers
// ============================================================
export async function claimDispatchJob(
  jobId: string,
): Promise<DispatchOutboxRow | null> {
  const now = new Date();
  const outbox = await db.jobDispatchOutbox.findUnique({ where: { jobId } });
  if (!outbox) return null;
  if (outbox.status === "dispatched") return null;
  if (
    outbox.status === "in_progress" &&
    outbox.lockUntil &&
    outbox.lockUntil > now
  )
    return null;
  if (outbox.status === "pending" && outbox.nextAttemptAt > now) return null;

  const updated = await db.jobDispatchOutbox.update({
    where: { jobId },
    data: {
      status: "in_progress",
      lockUntil: new Date(now.getTime() + 2 * 60_000),
      updatedAt: now,
    },
  });
  return updated;
}

export async function claimDueDispatchJobs(
  limit: number,
): Promise<DispatchOutboxRow[]> {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + 2 * 60_000);

  return db.$transaction(async (tx) => {
    const candidates = await tx.jobDispatchOutbox.findMany({
      where: {
        nextAttemptAt: { lte: now },
        OR: [
          { status: "pending" },
          { status: "in_progress", lockUntil: { lte: now } },
          { status: "in_progress", lockUntil: null },
        ],
      },
      take: limit,
      orderBy: { nextAttemptAt: "asc" },
      select: { jobId: true },
    });

    if (candidates.length === 0) {
      return [];
    }

    await tx.jobDispatchOutbox.updateMany({
      where: {
        jobId: { in: candidates.map((candidate) => candidate.jobId) },
      },
      data: {
        status: "in_progress",
        lockUntil,
        updatedAt: now,
      },
    });

    return tx.jobDispatchOutbox.findMany({
      where: {
        jobId: { in: candidates.map((candidate) => candidate.jobId) },
        status: "in_progress",
        lockUntil,
      },
      orderBy: { nextAttemptAt: "asc" },
    });
  });
}

export async function markDispatchJobSuccess(jobId: string): Promise<void> {
  const now = new Date();
  await db.jobDispatchOutbox.update({
    where: { jobId },
    data: {
      status: "dispatched",
      lockUntil: null,
      updatedAt: now,
      dispatchedAt: now,
      lastError: null,
    },
  });
}

export async function rescheduleDispatchJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const now = new Date();
  const current = await db.jobDispatchOutbox.findUnique({ where: { jobId } });
  if (!current || current.status === "dispatched") return;

  const attempts = current.attempts + 1;
  const delayMs = Math.min(5 * 60_000, 5_000 * 2 ** (attempts - 1));
  const nextAttemptAt = new Date(now.getTime() + delayMs);

  await db.jobDispatchOutbox.update({
    where: { jobId },
    data: {
      status: "pending",
      attempts,
      nextAttemptAt,
      lockUntil: null,
      lastError: errorMessage,
      updatedAt: now,
    },
  });
}
