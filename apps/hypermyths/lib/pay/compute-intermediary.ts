import { createHash, randomUUID } from "crypto";

import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  deriveAssociatedTokenAddress,
  verifySplTokenTransfer,
  type SplTokenTransferVerification,
} from "@/lib/onchain/solana";
import { getPayShEndpoint, payShEndpointUrl, type PayShEndpointId } from "@/lib/pay/catalog";
import { payShPostJson, type PayShJsonResult } from "@/lib/pay/client";
import type { PayShOperation, PayShRail, PayShWorkKind } from "@/lib/pay/intermediary";

// ── Community Compute Types ────────────────────────────────────────────────

export type ComputeWorkKind = "image_generation" | "video_generation" | "inference";

export type CommunityRegistration = {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  metadataUri?: string;
  socials?: {
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
  };
  publicAddress: string;
  acceptedJobTypes: ComputeWorkKind[];
};

export type CommunitySubsidyConfig = {
  mint: string;
  subsidyRateBps: number;
  minimumWalletUsd?: number;
  maxSubsidyPerJob?: number;
};

export type ComputeQuoteSummary = {
  quoteId: string;
  jobId: string;
  kind: ComputeWorkKind;
  rail: PayShRail;
  mint: string;
  communityName: string;
  communitySymbol: string;
  payShCostUsd: number;
  platformFeeUsd: number;
  bufferUsd: number;
  subtotalUsd: number;
  totalUsd: number;
  subsidyRateBps: number;
  subsidyUsd: number;
  userTokenUsd: number;
  userTokenRawAmount: string;
  tokenDecimals: number;
  walletAvailableUsd: number;
  expiresAt: string;
  operations: Array<{
    endpointId: PayShEndpointId;
    label: string;
    service: string;
    url: string;
    calls: number;
    priceUsd: number;
    totalUsd: number;
  }>;
};

export type ComputeCheckout = {
  quote: ComputeQuoteSummary;
  payment: {
    rail: PayShRail;
    mint: string;
    tokenDecimals: number;
    userTokenRawAmount: string;
    recipientAta: string;
    payerAddress: string | null;
  };
};

// ── Default operations per work kind ──────────────────────────────────────

const DEFAULT_IMAGE_OPERATIONS: PayShOperation[] = [
  { endpointId: "pay_sh_video_generate", calls: 1 },
];

const DEFAULT_VIDEO_COMPUTE_OPERATIONS: PayShOperation[] = [
  { endpointId: "pay_sh_video_generate", calls: 1 },
  { endpointId: "google_video_intelligence", calls: 1 },
];

const DEFAULT_INFERENCE_OPERATIONS: PayShOperation[] = [
  { endpointId: "perplexity_search", calls: 2 },
  { endpointId: "stableenrich_exa_answer", calls: 1 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function cents(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

function stableDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function defaultComputeOperations(kind: ComputeWorkKind): PayShOperation[] {
  if (kind === "image_generation") return DEFAULT_IMAGE_OPERATIONS;
  if (kind === "inference") return DEFAULT_INFERENCE_OPERATIONS;
  return DEFAULT_VIDEO_COMPUTE_OPERATIONS;
}

function kindToPayShWorkKind(kind: ComputeWorkKind): PayShWorkKind {
  return kind as PayShWorkKind;
}

// ── Community Registration ────────────────────────────────────────────────

export async function registerCommunity(input: CommunityRegistration): Promise<{
  wallet: { mint: string; publicAddress: string; currentBalanceUsd: number };
  policy: { subsidyRateBps: number };
}> {
  const env = getEnv();
  if (!env.PUMP_COMPUTE_ENABLED) {
    throw new Error("PUMP_COMPUTE_ENABLED is false.");
  }

  const existing = await db.communityComputeWallet.findUnique({ where: { mint: input.mint } });
  if (existing) {
    throw new Error(`Community already registered for mint ${input.mint}`);
  }

  const [wallet, policy] = await db.$transaction([
    db.communityComputeWallet.create({
      data: {
        mint: input.mint,
        name: input.name,
        symbol: input.symbol,
        image: input.image,
        description: input.description,
        metadataUri: input.metadataUri,
        socials: input.socials ?? {},
        publicAddress: input.publicAddress,
        acceptedJobTypes: input.acceptedJobTypes,
        currentBalanceUsd: 0,
        totalAllocatedUsd: 0,
        totalSpentUsd: 0,
        spendLimitUsd: 0,
        status: "active",
      },
    }),
    db.communitySubsidyPolicy.create({
      data: {
        mint: input.mint,
        subsidyRateBps: env.PUMP_COMPUTE_DEFAULT_SUBSIDY_BPS,
        minimumWalletUsd: 0,
        maxSubsidyPerJob: 0,
      },
    }),
  ]);

  // Cache pump metadata
  await db.pumpMetadataCache.upsert({
    where: { mint: input.mint },
    create: {
      mint: input.mint,
      name: input.name,
      symbol: input.symbol,
      image: input.image,
      description: input.description,
    },
    update: {
      name: input.name,
      symbol: input.symbol,
      image: input.image,
      description: input.description,
    },
  });

  return {
    wallet: {
      mint: wallet.mint,
      publicAddress: wallet.publicAddress,
      currentBalanceUsd: wallet.currentBalanceUsd,
    },
    policy: { subsidyRateBps: policy.subsidyRateBps },
  };
}

// ── Subsidy Policy ───────────────────────────────────────────────────────

export async function setSubsidyPolicy(input: CommunitySubsidyConfig): Promise<{
  mint: string;
  subsidyRateBps: number;
  minimumWalletUsd: number;
  maxSubsidyPerJob: number;
}> {
  const existing = await db.communityComputeWallet.findUnique({ where: { mint: input.mint } });
  if (!existing) {
    throw new Error(`Community not found for mint ${input.mint}`);
  }

  const policy = await db.communitySubsidyPolicy.upsert({
    where: { mint: input.mint },
    create: {
      mint: input.mint,
      subsidyRateBps: input.subsidyRateBps,
      minimumWalletUsd: input.minimumWalletUsd ?? 0,
      maxSubsidyPerJob: input.maxSubsidyPerJob ?? 0,
    },
    update: {
      subsidyRateBps: input.subsidyRateBps,
      minimumWalletUsd: input.minimumWalletUsd ?? 0,
      maxSubsidyPerJob: input.maxSubsidyPerJob ?? 0,
    },
  });

  return {
    mint: policy.mint,
    subsidyRateBps: policy.subsidyRateBps,
    minimumWalletUsd: policy.minimumWalletUsd,
    maxSubsidyPerJob: policy.maxSubsidyPerJob,
  };
}

// ── Creator Fee Allocation ───────────────────────────────────────────────

export async function allocateCreatorFees(input: {
  mint: string;
  amountUsd: number;
  depositTxHash?: string;
  allocatedBy?: string;
  note?: string;
}): Promise<{
  allocationId: string;
  mint: string;
  amountUsd: number;
  newBalanceUsd: number;
}> {
  const community = await db.communityComputeWallet.findUnique({ where: { mint: input.mint } });
  if (!community) {
    throw new Error(`Community not found for mint ${input.mint}`);
  }

  const [allocation] = await db.$transaction([
    db.communityComputeAllocation.create({
      data: {
        mint: input.mint,
        amountUsd: input.amountUsd,
        depositTxHash: input.depositTxHash,
        allocatedBy: input.allocatedBy ?? "admin",
        note: input.note,
      },
    }),
    db.communityComputeWallet.update({
      where: { mint: input.mint },
      data: {
        currentBalanceUsd: { increment: input.amountUsd },
        totalAllocatedUsd: { increment: input.amountUsd },
      },
    }),
  ]);

  const updated = await db.communityComputeWallet.findUnique({ where: { mint: input.mint } });

  return {
    allocationId: allocation.id,
    mint: input.mint,
    amountUsd: input.amountUsd,
    newBalanceUsd: updated?.currentBalanceUsd ?? community.currentBalanceUsd + input.amountUsd,
  };
}

// ── Quote ─────────────────────────────────────────────────────────────────

export async function quoteComputeWork(input: {
  jobId: string;
  kind: ComputeWorkKind;
  mint: string;
  operations?: PayShOperation[];
  inputDigest: string;
}): Promise<ComputeQuoteSummary> {
  const env = getEnv();
  if (!env.PUMP_COMPUTE_ENABLED) {
    throw new Error("PUMP_COMPUTE_ENABLED is false.");
  }

  const community = await db.communityComputeWallet.findUnique({ where: { mint: input.mint } });
  if (!community) {
    throw new Error(`Community not registered for mint ${input.mint}`);
  }
  if (community.status !== "active") {
    throw new Error(`Community ${community.name} is ${community.status}`);
  }

  const policy = await db.communitySubsidyPolicy.findUnique({ where: { mint: input.mint } });
  const subsidyRateBps = policy?.subsidyRateBps ?? env.PUMP_COMPUTE_DEFAULT_SUBSIDY_BPS;

  // Check job type is accepted
  const acceptedTypes = community.acceptedJobTypes as ComputeWorkKind[];
  if (!acceptedTypes.includes(input.kind)) {
    throw new Error(
      `Community ${community.name} does not accept ${input.kind} jobs. Accepted: ${acceptedTypes.join(", ")}`,
    );
  }

  // Price the upstream pay.sh operations
  const operations = input.operations ?? defaultComputeOperations(input.kind);
  const quotedOps = operations.map((op) => {
    const endpoint = getPayShEndpoint(op.endpointId);
    const calls = Math.max(1, op.calls ?? 1);
    return {
      endpointId: op.endpointId,
      label: endpoint.label,
      service: endpoint.service,
      url: payShEndpointUrl(endpoint),
      calls,
      priceUsd: endpoint.priceUsd,
      totalUsd: cents(endpoint.priceUsd * calls),
    };
  });

  const subtotalUsd = cents(quotedOps.reduce((sum, item) => sum + item.totalUsd, 0));
  const platformFeeUsd = cents((subtotalUsd * env.PUMP_COMPUTE_PLATFORM_FEE_BPS) / 10_000);
  const bufferUsd = cents((subtotalUsd * env.PUMP_COMPUTE_BUFFER_BPS) / 10_000);
  const payShCostUsd = cents(subtotalUsd + platformFeeUsd + bufferUsd);

  // Subsidy math
  // subsidyUsd = min(walletAvailableUsd, payShCostUsd * subsidyRateBps / 10000)
  const maxSubsidyByRate = cents(payShCostUsd * (subsidyRateBps / 10_000));
  let subsidyUsd = Math.min(community.currentBalanceUsd, maxSubsidyByRate);

  // Apply per-job cap if set
  if (policy?.maxSubsidyPerJob && policy.maxSubsidyPerJob > 0) {
    subsidyUsd = Math.min(subsidyUsd, policy.maxSubsidyPerJob);
  }

  // Check minimum wallet threshold
  if (policy?.minimumWalletUsd && policy.minimumWalletUsd > 0) {
    if (community.currentBalanceUsd - subsidyUsd < policy.minimumWalletUsd) {
      subsidyUsd = Math.max(0, community.currentBalanceUsd - policy.minimumWalletUsd);
    }
  }

  // Ensure subsidy doesn't exceed wallet balance
  subsidyUsd = Math.min(subsidyUsd, community.currentBalanceUsd);

  const userTokenUsd = cents(payShCostUsd - subsidyUsd);

  // Verify the compute wallet can cover the upstream spend
  if (community.currentBalanceUsd < payShCostUsd) {
    throw new Error(
      `Insufficient compute wallet balance. Need $${payShCostUsd}, have $${community.currentBalanceUsd}`,
    );
  }

  const expiresAt = new Date(Date.now() + env.PUMP_COMPUTE_QUOTE_TTL_SECONDS * 1000);
  const quoteId = randomUUID();

    // Store quote in DB
    const stored = await db.payShQuote.create({
      data: {
        id: quoteId,
        jobId: input.jobId,
        kind: kindToPayShWorkKind(input.kind),
        rail: "pump_spl_subsidized",
        currency: community.symbol,
        network: "solana",
        status: "quoted",
        subtotalUsd,
        platformFeeUsd: platformFeeUsd + subsidyUsd,
        bufferUsd,
        totalUsd: payShCostUsd,
        totalLamports: BigInt(Math.ceil(userTokenUsd * 1_000_000_000)),
        totalUsdcMicros: BigInt(Math.ceil(payShCostUsd * 1_000_000)),
        platformFeeBps: env.PUMP_COMPUTE_PLATFORM_FEE_BPS,
        bufferBps: env.PUMP_COMPUTE_BUFFER_BPS,
        paymentAddress: community.publicAddress,
        operations: quotedOps,
        inputDigest: input.inputDigest,
        expiresAt,
      },
    });

  return {
    quoteId: stored.id,
    jobId: input.jobId,
    kind: input.kind,
    rail: "pump_spl_subsidized",
    mint: input.mint,
    communityName: community.name,
    communitySymbol: community.symbol,
    payShCostUsd,
    platformFeeUsd,
    bufferUsd,
    subtotalUsd,
    totalUsd: payShCostUsd,
    subsidyRateBps,
    subsidyUsd,
    userTokenUsd,
    userTokenRawAmount: String(BigInt(Math.ceil(userTokenUsd * 1_000_000_000))),
    tokenDecimals: 9,
    walletAvailableUsd: community.currentBalanceUsd,
    expiresAt: expiresAt.toISOString(),
    operations: quotedOps,
  };
}

// ── Create Compute Job ────────────────────────────────────────────────────

export async function createComputeJob(input: {
  job: {
    jobId: string;
    wallet: string;
    requestKind?: string;
    requestedPrompt?: string;
    subjectName?: string;
    subjectSymbol?: string;
    subjectImage?: string;
    subjectDescription?: string;
    packageType?: string;
    rangeDays?: number;
    priceSol?: number;
    videoSeconds?: number;
  };
  kind: ComputeWorkKind;
  mint: string;
  operations?: PayShOperation[];
}): Promise<ComputeCheckout> {
  const env = getEnv();
  if (!env.PUMP_COMPUTE_ENABLED) {
    throw new Error("PUMP_COMPUTE_ENABLED is false.");
  }

  const inputDigest = stableDigest({
    kind: input.kind,
    jobId: input.job.jobId,
    input: input.job.requestedPrompt ?? input.job.subjectName,
  });

  const quote = await quoteComputeWork({
    jobId: input.job.jobId,
    kind: input.kind,
    mint: input.mint,
    operations: input.operations,
    inputDigest,
  });

  const recipientAta = deriveAssociatedTokenAddress(input.mint, input.job.wallet);

  const existingJob = await db.job.findUnique({ where: { jobId: input.job.jobId } });
  if (!existingJob) {
    await db.job.create({
      data: {
        jobId: input.job.jobId,
        wallet: input.job.wallet,
        requestKind: input.job.requestKind ?? input.kind,
        packageType: (input.job.packageType as "30s" | "60s") ?? "30s",
        rangeDays: input.job.rangeDays ?? 7,
        priceSol: input.job.priceSol ?? 0,
        priceUsdc: quote.totalUsd,
        videoSeconds: input.job.videoSeconds ?? 60,
        subjectName: input.job.subjectName,
        subjectSymbol: input.job.subjectSymbol ?? quote.communitySymbol,
        subjectImage: input.job.subjectImage,
        subjectDescription: input.job.subjectDescription,
        requestedPrompt: input.job.requestedPrompt,
        status: "awaiting_payment",
        progress: "awaiting_payment",
        paymentMethod: "pump_spl_subsidized",
        paymentCurrency: quote.communitySymbol,
        paymentNetwork: "solana",
        paymentAddress: quote.mint,
        paymentRouting: "pump_spl_subsidized",
        requiredLamports: BigInt(quote.userTokenRawAmount),
      },
    });
  } else {
    await db.job.update({
      where: { jobId: input.job.jobId },
      data: {
        status: "awaiting_payment",
        progress: "awaiting_payment",
        paymentMethod: "pump_spl_subsidized",
        paymentCurrency: quote.communitySymbol,
        paymentNetwork: "solana",
        paymentAddress: quote.mint,
        paymentRouting: "pump_spl_subsidized",
        requiredLamports: BigInt(quote.userTokenRawAmount),
        priceSol: 0,
        priceUsdc: quote.totalUsd,
        updatedAt: new Date(),
      },
    });
  }

  await db.jobDispatchOutbox.delete({ where: { jobId: input.job.jobId } }).catch(() => undefined);

  return {
    quote,
    payment: {
      rail: "pump_spl_subsidized",
      mint: input.mint,
      tokenDecimals: 9,
      userTokenRawAmount: quote.userTokenRawAmount,
      recipientAta,
      payerAddress: input.job.wallet,
    },
  };
}

// ── Confirm Token Payment ─────────────────────────────────────────────────

export async function confirmTokenPayment(input: {
  jobId: string;
  mint: string;
  payerAddress: string;
  signature: string;
}): Promise<{
  verified: boolean;
  jobId: string;
  tokenAmount: string;
}> {
  const quote = await db.payShQuote.findFirst({
    where: { jobId: input.jobId, rail: "pump_spl_subsidized" },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) throw new Error("Compute quote not found.");
  if (quote.status === "expired" || quote.expiresAt < new Date()) {
    await db.payShQuote.update({ where: { id: quote.id }, data: { status: "expired" } });
    throw new Error("Compute quote expired.");
  }

  // Check for duplicate signature
  const existingPayment = await db.communityTokenPayment.findUnique({
    where: { signature: input.signature },
  });
  if (existingPayment) {
    throw new Error("This token payment signature has already been used.");
  }

  const community = await db.communityComputeWallet.findUnique({ where: { mint: input.mint } });
  if (!community) throw new Error(`Community not found for mint ${input.mint}`);

  const recipientAta = deriveAssociatedTokenAddress(input.mint, input.payerAddress);
  const totalLamports = quote.totalLamports; // This is userTokenRawAmount equiv

  const tokenPaymentId = randomUUID();
  let verification: SplTokenTransferVerification;
  try {
    verification = await verifySplTokenTransfer({
      signature: input.signature,
      expectedSender: input.payerAddress,
      expectedMint: input.mint,
      expectedRecipientAta: recipientAta,
      minimumRawAmount: totalLamports,
      expectedDecimals: 9,
    });
  } catch (err) {
    // Record failed verification
    await db.communityTokenPayment.create({
      data: {
        id: tokenPaymentId,
        jobId: input.jobId,
        mint: input.mint,
        payerAddress: input.payerAddress,
        signature: input.signature,
        recipientAta,
        tokenAmount: BigInt(0),
        tokenDecimals: 9,
        expectedUsd: Number(totalLamports) / 1_000_000_000,
        verified: false,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    throw err;
  }

  const now = new Date();
  await db.$transaction([
    db.communityTokenPayment.create({
      data: {
        id: tokenPaymentId,
        jobId: input.jobId,
        mint: input.mint,
        payerAddress: input.payerAddress,
        signature: input.signature,
        recipientAta,
        tokenAmount: verification.paidRawAmount,
        tokenDecimals: verification.decimals,
        expectedUsd: Number(totalLamports) / 1_000_000_000,
        verified: true,
        verifiedAt: now,
      },
    }),
    db.payShQuote.update({
      where: { id: quote.id },
      data: {
        status: "paid",
        payerAddress: input.payerAddress,
        paymentSignature: input.signature,
        paidAt: now,
      },
    }),
    db.job.update({
      where: { jobId: input.jobId },
      data: {
        status: "payment_confirmed",
        progress: "payment_confirmed",
        txSignature: input.signature,
        paymentSignatures: [input.signature],
        lastPaymentAt: now.toISOString(),
        updatedAt: now,
      },
    }),
    db.jobDispatchOutbox.upsert({
      where: { jobId: input.jobId },
      create: {
        jobId: input.jobId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lockUntil: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        dispatchedAt: null,
      },
      update: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lockUntil: null,
        lastError: null,
        updatedAt: now,
        dispatchedAt: null,
      },
    }),
  ]);

  return {
    verified: true,
    jobId: input.jobId,
    tokenAmount: verification.paidRawAmount.toString(),
  };
}

// ── Spend Compute Job ─────────────────────────────────────────────────────

export async function spendComputeJob(input: {
  jobId: string;
  endpointId: PayShEndpointId;
  body: Record<string, unknown>;
}): Promise<PayShJsonResult> {
  const quote = await db.payShQuote.findFirst({
    where: { jobId: input.jobId, rail: "pump_spl_subsidized", status: { in: ["paid", "spent"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) throw new Error(`Cannot spend compute before token payment for job ${input.jobId}.`);

  const community = await db.communityComputeWallet.findFirst({
    where: { status: "active" },
  });
  if (!community) throw new Error("No active community compute wallet found for this job.");

  // Check balance
  if (community.currentBalanceUsd < quote.totalUsd) {
    throw new Error(`Compute wallet balance too low: need $${quote.totalUsd}, have $${community.currentBalanceUsd}`);
  }

  const endpoint = getPayShEndpoint(input.endpointId);
  const requestHash = stableDigest({ endpointId: input.endpointId, body: input.body });
  const spendId = randomUUID();

  await db.communityComputeSpend.create({
    data: {
      id: spendId,
      jobId: input.jobId,
      mint: community.mint,
      endpointId: input.endpointId,
      service: endpoint.service,
      url: payShEndpointUrl(endpoint),
      status: "pending",
      quotedUsd: endpoint.priceUsd,
      requestHash,
    },
  });

  const result = await payShPostJson(input.endpointId, input.body);

  await db.$transaction([
    db.communityComputeSpend.update({
      where: { id: spendId },
      data: {
        status: result.status,
        paidUsd: result.status === "ok" ? endpoint.priceUsd : null,
        responseDigest: result.data ? stableDigest(result.data) : null,
        error: result.error,
        updatedAt: new Date(),
      },
    }),
    ...(result.status === "ok"
      ? [
          db.communityComputeWallet.update({
            where: { mint: community.mint },
            data: {
              currentBalanceUsd: { decrement: endpoint.priceUsd },
              totalSpentUsd: { increment: endpoint.priceUsd },
            },
          }),
        ]
      : []),
  ]);

  if (result.status === "ok") {
    await db.payShQuote.update({
      where: { id: quote.id },
      data: { status: "spent", updatedAt: new Date() },
    });
  }

  return result;
}

// ── Get Community ─────────────────────────────────────────────────────────

export async function getCommunity(mint: string) {
  const community = await db.communityComputeWallet.findUnique({ where: { mint } });
  if (!community) return null;

  const policy = await db.communitySubsidyPolicy.findUnique({ where: { mint } });

  return {
    mint: community.mint,
    name: community.name,
    symbol: community.symbol,
    image: community.image,
    description: community.description,
    metadataUri: community.metadataUri,
    socials: community.socials,
    publicAddress: community.publicAddress,
    acceptedJobTypes: community.acceptedJobTypes as ComputeWorkKind[],
    status: community.status,
    currentBalanceUsd: community.currentBalanceUsd,
    totalAllocatedUsd: community.totalAllocatedUsd,
    totalSpentUsd: community.totalSpentUsd,
    spendLimitUsd: community.spendLimitUsd,
    subsidyPolicy: policy
      ? {
          subsidyRateBps: policy.subsidyRateBps,
          minimumWalletUsd: policy.minimumWalletUsd,
          maxSubsidyPerJob: policy.maxSubsidyPerJob,
        }
      : null,
  };
}

export async function listCommunities() {
  const communities = await db.communityComputeWallet.findMany({
    orderBy: { currentBalanceUsd: "desc" },
  });

  return communities.map((c) => ({
    mint: c.mint,
    name: c.name,
    symbol: c.symbol,
    image: c.image,
    publicAddress: c.publicAddress,
    acceptedJobTypes: c.acceptedJobTypes as ComputeWorkKind[],
    status: c.status,
    currentBalanceUsd: c.currentBalanceUsd,
  }));
}
