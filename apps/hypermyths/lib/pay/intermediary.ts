import { createHash, randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { deriveJobPaymentAddress, verifySolPaymentSignature } from "@/lib/onchain/solana";
import { getPayShEndpoint, payShEndpointUrl, type PayShEndpointId } from "@/lib/pay/catalog";
import { payShPostJson, type PayShJsonResult } from "@/lib/pay/client";
import type { JobDocument, JobRequestKind } from "@/lib/types/domain";

export type PayShRail = "solana_sol" | "x402_usdc";
export type PayShWorkKind = "asset_scan" | "video_generation";

export type PayShOperation = {
  endpointId: PayShEndpointId;
  calls?: number;
};

export type PayShQuoteSummary = {
  quoteId: string;
  jobId: string;
  kind: PayShWorkKind;
  rail: PayShRail;
  currency: "SOL" | "USDC";
  subtotalUsd: number;
  platformFeeUsd: number;
  bufferUsd: number;
  totalUsd: number;
  totalLamports: string;
  totalSol: number;
  totalUsdcMicros: string;
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

export type PayShCheckout = {
  quote: PayShQuoteSummary;
  payment: {
    rail: PayShRail;
    currency: "SOL" | "USDC";
    network: string;
    paymentAddress: string | null;
    amountSol: number;
    amountUsdc: number;
    requiredLamports: string;
    x402Url: string | null;
  };
};

const DEFAULT_ASSET_SCAN_OPERATIONS: PayShOperation[] = [
  { endpointId: "perplexity_search" },
  { endpointId: "stableenrich_exa_answer" },
  { endpointId: "stableenrich_exa_search" },
  { endpointId: "stableenrich_serper_news" },
  { endpointId: "stableenrich_reddit_search" },
  { endpointId: "stablesocial_tiktok_search" },
];

const DEFAULT_VIDEO_OPERATIONS: PayShOperation[] = [
  { endpointId: "pay_sh_video_generate" },
  { endpointId: "google_video_intelligence" },
];

function cents(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

function stableDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function quoteOperations(operations: PayShOperation[]) {
  return operations.map((operation) => {
    const endpoint = getPayShEndpoint(operation.endpointId);
    const calls = Math.max(1, operation.calls ?? 1);
    return {
      endpointId: operation.endpointId,
      label: endpoint.label,
      service: endpoint.service,
      url: payShEndpointUrl(endpoint),
      calls,
      priceUsd: endpoint.priceUsd,
      totalUsd: cents(endpoint.priceUsd * calls),
    };
  });
}

export function defaultPayShOperations(kind: PayShWorkKind): PayShOperation[] {
  return kind === "asset_scan" ? DEFAULT_ASSET_SCAN_OPERATIONS : DEFAULT_VIDEO_OPERATIONS;
}

export function quotePayShWork(input: {
  jobId: string;
  kind: PayShWorkKind;
  rail: PayShRail;
  operations?: PayShOperation[];
  inputDigest: string;
}): Omit<PayShQuoteSummary, "quoteId" | "expiresAt"> & {
  expiresAt: Date;
  totalUsdcMicrosBigInt: bigint;
  totalLamportsBigInt: bigint;
  network: string;
} {
  const env = getEnv();
  const operations = quoteOperations(input.operations ?? defaultPayShOperations(input.kind));
  const subtotalUsd = cents(operations.reduce((sum, item) => sum + item.totalUsd, 0));
  const platformFeeUsd = cents((subtotalUsd * env.PAY_SH_PLATFORM_FEE_BPS) / 10_000);
  const bufferUsd = cents((subtotalUsd * env.PAY_SH_BUFFER_BPS) / 10_000);
  const totalUsd = cents(subtotalUsd + platformFeeUsd + bufferUsd);
  const totalUsdcMicrosBigInt = BigInt(Math.ceil(totalUsd * 1_000_000));
  const sol = totalUsd / env.PAY_SH_SOL_USD_RATE;
  const totalLamportsBigInt = BigInt(Math.ceil(sol * 1_000_000_000));
  const expiresAt = new Date(Date.now() + env.PAY_SH_QUOTE_TTL_SECONDS * 1000);

  return {
    jobId: input.jobId,
    kind: input.kind,
    rail: input.rail,
    currency: input.rail === "solana_sol" ? "SOL" : "USDC",
    subtotalUsd,
    platformFeeUsd,
    bufferUsd,
    totalUsd,
    totalLamports: totalLamportsBigInt.toString(),
    totalSol: Number(totalLamportsBigInt) / 1_000_000_000,
    totalUsdcMicros: totalUsdcMicrosBigInt.toString(),
    totalUsdcMicrosBigInt,
    totalLamportsBigInt,
    expiresAt,
    network: input.rail === "solana_sol" ? "solana" : "x402",
    operations,
  };
}

function serializeQuote(row: {
  id: string;
  jobId: string;
  kind: string;
  rail: string;
  currency: string;
  subtotalUsd: number;
  platformFeeUsd: number;
  bufferUsd: number;
  totalUsd: number;
  totalLamports: bigint;
  totalUsdcMicros: bigint;
  expiresAt: Date;
  operations: Prisma.JsonValue;
}): PayShQuoteSummary {
  return {
    quoteId: row.id,
    jobId: row.jobId,
    kind: row.kind as PayShWorkKind,
    rail: row.rail as PayShRail,
    currency: row.currency as "SOL" | "USDC",
    subtotalUsd: row.subtotalUsd,
    platformFeeUsd: row.platformFeeUsd,
    bufferUsd: row.bufferUsd,
    totalUsd: row.totalUsd,
    totalLamports: row.totalLamports.toString(),
    totalSol: Number(row.totalLamports) / 1_000_000_000,
    totalUsdcMicros: row.totalUsdcMicros.toString(),
    expiresAt: row.expiresAt.toISOString(),
    operations: row.operations as PayShQuoteSummary["operations"],
  };
}

export async function createPayShCheckout(input: {
  job: JobDocument;
  kind: PayShWorkKind;
  rail?: PayShRail;
  operations?: PayShOperation[];
  input?: unknown;
}): Promise<PayShCheckout> {
  const env = getEnv();
  if (!env.PAY_SH_ENABLED) {
    throw new Error("PAY_SH_ENABLED is false; paid Pay.sh jobs are disabled.");
  }

  const rail = input.rail ?? "solana_sol";
  if (rail === "solana_sol" && !env.PAY_SH_SOLANA_ENABLED) {
    throw new Error("PAY_SH_SOLANA_ENABLED is false.");
  }
  if (rail === "x402_usdc" && !env.PAY_SH_X402_ENABLED) {
    throw new Error("PAY_SH_X402_ENABLED is false.");
  }

  const inputDigest = stableDigest({
    kind: input.kind,
    jobId: input.job.jobId,
    input: input.input ?? input.job.requestedPrompt ?? input.job.subjectName,
  });
  const quote = quotePayShWork({
    jobId: input.job.jobId,
    kind: input.kind,
    rail,
    operations: input.operations,
    inputDigest,
  });
  const paymentAddress =
    rail === "solana_sol" ? deriveJobPaymentAddress(input.job.jobId) : null;

  const row = await db.payShQuote.create({
    data: {
      jobId: input.job.jobId,
      kind: input.kind,
      rail,
      currency: quote.currency,
      network: quote.network,
      status: "quoted",
      subtotalUsd: quote.subtotalUsd,
      platformFeeUsd: quote.platformFeeUsd,
      bufferUsd: quote.bufferUsd,
      totalUsd: quote.totalUsd,
      totalLamports: quote.totalLamportsBigInt,
      totalUsdcMicros: quote.totalUsdcMicrosBigInt,
      platformFeeBps: env.PAY_SH_PLATFORM_FEE_BPS,
      bufferBps: env.PAY_SH_BUFFER_BPS,
      paymentAddress,
      operations: quote.operations,
      inputDigest,
      expiresAt: quote.expiresAt,
    },
  });

  await db.job.update({
    where: { jobId: input.job.jobId },
    data: {
      status: "awaiting_payment",
      progress: "awaiting_payment",
      paymentMethod: rail === "solana_sol" ? "sol_dedicated_address" : "x402_usdc",
      paymentCurrency: quote.currency,
      paymentNetwork: quote.network,
      paymentAddress: paymentAddress ?? "x402",
      paymentRouting: rail === "solana_sol" ? "dedicated_address" : "x402",
      requiredLamports: quote.totalLamportsBigInt,
      priceSol: quote.totalSol,
      priceUsdc: quote.totalUsd,
      paymentWaived: false,
      updatedAt: new Date(),
    },
  });

  await db.jobDispatchOutbox.delete({ where: { jobId: input.job.jobId } }).catch(() => undefined);

  const summary = serializeQuote(row);
  return {
    quote: summary,
    payment: {
      rail,
      currency: summary.currency,
      network: rail === "solana_sol" ? "solana" : "x402",
      paymentAddress,
      amountSol: summary.totalSol,
      amountUsdc: summary.totalUsd,
      requiredLamports: summary.totalLamports,
      x402Url: rail === "x402_usdc" ? `/api/pay-sh/x402/${input.job.jobId}` : null,
    },
  };
}

export async function getActivePayShCheckout(jobId: string): Promise<PayShCheckout | null> {
  const quote = await db.payShQuote.findFirst({
    where: { jobId },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) return null;

  const summary = serializeQuote(quote);
  return {
    quote: summary,
    payment: {
      rail: summary.rail,
      currency: summary.currency,
      network: summary.rail === "solana_sol" ? "solana" : "x402",
      paymentAddress: quote.paymentAddress,
      amountSol: summary.totalSol,
      amountUsdc: summary.totalUsd,
      requiredLamports: summary.totalLamports,
      x402Url: summary.rail === "x402_usdc" ? `/api/pay-sh/x402/${jobId}` : null,
    },
  };
}

export async function confirmPayShPayment(input: {
  jobId: string;
  rail: PayShRail;
  payerAddress: string;
  signature?: string;
  x402Transaction?: string;
}): Promise<PayShCheckout> {
  const quote = await db.payShQuote.findFirst({
    where: { jobId: input.jobId, rail: input.rail },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) throw new Error("Pay.sh quote not found.");
  if (quote.status === "expired" || quote.expiresAt < new Date()) {
    await db.payShQuote.update({ where: { id: quote.id }, data: { status: "expired" } });
    throw new Error("Pay.sh quote expired.");
  }

  let paidLamports = BigInt(0);
  if (input.rail === "solana_sol") {
    if (!input.signature) throw new Error("Solana payment signature is required.");
    if (!quote.paymentAddress) throw new Error("Solana payment address missing.");
    const verified = await verifySolPaymentSignature({
      signature: input.signature,
      expectedSender: input.payerAddress,
      expectedRecipient: quote.paymentAddress,
      minimumLamports: quote.totalLamports,
    });
    paidLamports = verified.paidLamports;
  } else {
    if (!input.x402Transaction) throw new Error("x402 transaction proof is required.");
  }

  const now = new Date();
  await db.$transaction([
    db.payShQuote.update({
      where: { id: quote.id },
      data: {
        status: "paid",
        payerAddress: input.payerAddress,
        paymentSignature: input.signature,
        x402Transaction: input.x402Transaction,
        paidAt: now,
      },
    }),
    db.job.update({
      where: { jobId: input.jobId },
      data: {
        status: "payment_confirmed",
        progress: "payment_confirmed",
        txSignature: input.signature ?? input.x402Transaction ?? null,
        x402Transaction: input.x402Transaction,
        receivedLamports: paidLamports,
        paymentSignatures: input.signature ? [input.signature] : undefined,
        lastPaymentAt: now,
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

  const checkout = await getActivePayShCheckout(input.jobId);
  if (!checkout) throw new Error("Pay.sh checkout not found after confirmation.");
  return checkout;
}

export async function ensurePayShJobIsPaid(job: JobDocument): Promise<void> {
  if (job.paymentWaived) return;
  if (job.status !== "payment_confirmed" && job.status !== "processing") {
    throw new Error(`Pay.sh job ${job.jobId} is not paid; current status is ${job.status}.`);
  }
  const quote = await db.payShQuote.findFirst({
    where: { jobId: job.jobId, status: { in: ["paid", "spent"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) throw new Error(`Pay.sh job ${job.jobId} has no paid quote.`);
}

export async function spendPaySh(input: {
  jobId: string;
  endpointId: PayShEndpointId;
  body: Record<string, unknown>;
}): Promise<PayShJsonResult> {
  const quote = await db.payShQuote.findFirst({
    where: { jobId: input.jobId, status: { in: ["paid", "spent"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) throw new Error(`Cannot spend Pay.sh before payment for job ${input.jobId}.`);

  const endpoint = getPayShEndpoint(input.endpointId);
  const requestHash = stableDigest({ endpointId: input.endpointId, body: input.body });
  const spendId = randomUUID();
  await db.payShSpend.create({
    data: {
      id: spendId,
      quoteId: quote.id,
      jobId: input.jobId,
      endpointId: input.endpointId,
      service: endpoint.service,
      url: payShEndpointUrl(endpoint),
      status: "pending",
      quotedUsd: endpoint.priceUsd,
      requestHash,
    },
  });

  const result = await payShPostJson(input.endpointId, input.body);
  await db.payShSpend.update({
    where: { id: spendId },
    data: {
      status: result.status,
      paidUsd: result.status === "ok" ? endpoint.priceUsd : null,
      responseDigest: result.data ? stableDigest(result.data) : null,
      error: result.error,
      updatedAt: new Date(),
    },
  });
  if (result.status === "ok") {
    await db.payShQuote.update({
      where: { id: quote.id },
      data: { status: "spent", updatedAt: new Date() },
    });
  }

  return result;
}

export function isPayShBackedRequestKind(requestKind: JobRequestKind | undefined): boolean {
  return requestKind === "asset_scan" || requestKind === "token_video" || requestKind === "generic_cinema" || requestKind === "mythx" || requestKind === "wallet_recap";
}
