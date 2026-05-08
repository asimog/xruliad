import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { scannerChainSchema, scanToken, type TokenScanResult } from "@/lib/chat/token-scanner";
import { logger } from "@/lib/logging/logger";
import { db } from "@/lib/db";
import type { ReportDocument, SupportedTokenChain } from "@/lib/types/domain";

export const runtime = "nodejs";

const payloadSchema = z.object({
  address: z.string().trim().min(20).max(128),
  chain: scannerChainSchema.optional(),
});

const RATE_LIMIT_RULES = [
  { name: "token_scan_per_day", windowSec: 86_400, limit: 10 },
] as const;

const SCAN_IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;
const UNKNOWN_ADDRESS = "unknown-token";

function fallbackScanResult(input: {
  address?: string | null;
  chain?: SupportedTokenChain | null;
  reason?: string | null;
}): TokenScanResult {
  const address = input.address?.trim() || UNKNOWN_ADDRESS;
  const chain = input.chain ?? "solana";
  const shortAddress =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  const reason = input.reason?.trim();

  return {
    address,
    chain,
    generatedAt: new Date().toISOString(),
    agent: {
      name: "Hermes",
      status: "error",
      xActionsStatus: "not_applicable",
      summary:
        "Hermes prepared a limited scanner report. Live market sources were unavailable, so treat this as a placeholder until fresh signals resolve.",
    },
    providerStatus: {
      helius: "error",
      dexscreener: "error",
      birdeye: "error",
      gmgn: "error",
      hermes: "error",
      xactions: "not_applicable",
    },
    token: {
      name: shortAddress,
      symbol: null,
      logoUrl: null,
      priceUsd: null,
      marketCapUsd: null,
      liquidityUsd: null,
      volume24hUsd: null,
      priceChange24hPercent: null,
      holders: null,
      supply: null,
      decimals: null,
    },
    categories: {
      technical: [
        "Live contract reads were unavailable for this request.",
        "Confirm the contract address and chain before making decisions.",
      ],
      market: [
        "Live market data did not resolve for this scan.",
        "Check liquidity, volume, and recent price movement directly on a market terminal.",
      ],
      thesis: [
        "No confident thesis can be formed from unavailable market signals.",
        "Wait for a fresh scan before treating this token as actionable.",
      ],
      public: [
        "Public signal feeds were unavailable during this scan.",
        "Review official channels and recent social activity manually.",
      ],
    },
    risk: {
      score: 100,
      label: "Unknown",
      flags: reason ? ["Limited report generated"] : [],
    },
    article: {
      title: `Limited scanner report for ${shortAddress}`,
      summary: [
        "The scanner returned a limited report for this run.",
        "Live sources were unavailable or incomplete for this request.",
        "Use this report as a safe placeholder and rerun when data providers recover.",
      ],
      story: [
        `${shortAddress} could not be fully resolved through the live scanner stack.`,
        "The safest reading is uncertainty: no market, holder, liquidity, or public-signal claim should be treated as verified from this run.",
        "A fresh scan can replace this limited report once the live data providers respond cleanly.",
      ],
      embeddedTweets: [],
    },
    sources: {
      helius: {
        asset: null,
        supply: null,
        largestAccounts: null,
      },
      dexscreener: {
        pairUrl: null,
        dexId: null,
        boosts: null,
        rawPair: null,
      },
      birdeye: {
        overview: null,
        security: null,
      },
      gmgn: {
        summary: "GMGN unavailable for limited scanner fallback.",
        tokenInfo: null,
        kolTrades: null,
        smartMoneyTrades: null,
      },
      social: {
        tweets: [],
        raw: null,
      },
    },
  };
}

function scanSummary(result: TokenScanResult): string {
  const parts = [
    result.article.title,
    ...result.article.summary,
    result.agent.summary,
    result.risk.flags.length
      ? `Risk flags: ${result.risk.flags.join(", ")}.`
      : `Risk level: ${result.risk.label}.`,
  ].filter(Boolean);

  return parts.join("\n\n");
}

function buildScanReport(jobId: string, result: TokenScanResult): ReportDocument {
  const subjectName =
    result.token.name ||
    result.token.symbol ||
    `${result.address.slice(0, 6)}...${result.address.slice(-4)}`;

  return {
    jobId,
    wallet: result.address,
    rangeDays: 1,
    subjectKind: "token_scan",
    pricingMode: "public",
    visibility: "public",
    experience: "hyperm",
    moderationStatus: "visible",
    subjectAddress: result.address,
    subjectChain: result.chain as SupportedTokenChain,
    subjectName,
    subjectSymbol: result.token.symbol,
    subjectImage: result.token.logoUrl,
    subjectDescription: result.article.summary.join(" "),
    durationSeconds: 0,
    audioEnabled: false,
    tokenLinks: result.sources.dexscreener.pairUrl
      ? [{ label: "DexScreener", url: result.sources.dexscreener.pairUrl }]
      : [],
    marketSnapshot: {
      priceUsd: result.token.priceUsd,
      marketCapUsd: result.token.marketCapUsd,
      liquidityUsd: result.token.liquidityUsd,
      volume24hUsd: result.token.volume24hUsd,
      pairUrl: result.sources.dexscreener.pairUrl,
    },
    pumpTokensTraded: 0,
    buyCount: 0,
    sellCount: 0,
    solSpent: 0,
    solReceived: 0,
    estimatedPnlSol: 0,
    bestTrade: "",
    worstTrade: "",
    styleClassification: `Scanner: ${result.risk.label} risk`,
    summary: scanSummary(result),
    timeline: [],
    downloadUrl: null,
    behaviorPatterns: result.categories.technical,
    memorableMoments: result.categories.market,
    funObservations: result.categories.public,
    narrativeSummary: result.article.story.join("\n\n"),
    storyBeats: result.categories.thesis,
  };
}

async function findRecentScanJob(result: TokenScanResult): Promise<string | null> {
  const cutoff = new Date(Date.now() - SCAN_IDEMPOTENCY_WINDOW_MS);
  const existing = await db.job.findFirst({
    where: {
      requestKind: "token_scan",
      subjectAddress: result.address,
      subjectChain: result.chain,
      status: "complete",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { jobId: true },
  });

  return existing?.jobId ?? null;
}

export async function POST(request: NextRequest) {
  let requestedAddress: string | null = null;
  let requestedChain: SupportedTokenChain = "solana";

  try {
    const body = (await request.json().catch(() => ({}))) as {
      address?: unknown;
      chain?: unknown;
    };
    requestedAddress =
      typeof body.address === "string" ? body.address.trim() : requestedAddress;
    requestedChain =
      body.chain === "ethereum" || body.chain === "base" || body.chain === "solana"
        ? body.chain
        : "solana";

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_token_scan",
      key: ip,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        fallbackScanResult({
          address: requestedAddress,
          chain: requestedChain,
          reason: "rate_limited",
        }),
      );
    }

    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        fallbackScanResult({
          address: requestedAddress,
          chain: requestedChain,
          reason: "invalid_address",
        }),
      );
    }

    const result = await scanToken(parsed.data);

    // Save the scan result as a job card on the feed
    let feedJobId: string | null = null;
    try {
      const existingJobId = await findRecentScanJob(result);
      if (existingJobId) {
        feedJobId = existingJobId;
      } else {
        const jobId = randomUUID();
        feedJobId = jobId;
        const subjectName =
          result.token.name ||
          result.token.symbol ||
          `${result.address.slice(0, 6)}...${result.address.slice(-4)}`;
        const now = new Date();

        await db.$transaction([
          db.job.create({
            data: {
              jobId,
              wallet: result.address,
              status: "complete",
              progress: "complete",
              requestKind: "token_scan",
              pricingMode: "public",
              visibility: "public",
              experience: "hyperm",
              moderationStatus: "visible",
              subjectAddress: result.address,
              subjectChain: result.chain,
              subjectName,
              subjectSymbol: result.token.symbol,
              subjectImage: result.token.logoUrl,
              subjectDescription: result.article.summary.join(" "),
              requestedPrompt: `Token scan: ${subjectName}`,
              audioEnabled: false,
              packageType: "30s",
              rangeDays: 1,
              priceSol: 0,
              priceUsdc: 0,
              videoSeconds: 0,
              paymentWaived: true,
              paymentAddress: "none",
              paymentRouting: "legacy_memo",
              requiredLamports: BigInt(0),
              createdAt: now,
              updatedAt: now,
            },
          }),
          db.report.create({
            data: buildScanReport(jobId, result) as unknown as Prisma.ReportUncheckedCreateInput,
          }),
        ]);
      }
    } catch (jobError) {
      logger.error("token_scan_job_save_failed", {
        component: "api_token_scan",
        stage: "job_save",
        errorMessage: jobError instanceof Error ? jobError.message : "Unknown error",
      });
      // Don't fail the scan if job save fails - still return the result
    }

    return NextResponse.json({ ...result, jobId: feedJobId });
  } catch (error) {
    logger.error("token_scan_failed", {
      component: "api_token_scan",
      stage: "post",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      fallbackScanResult({
        address: requestedAddress,
        chain: requestedChain,
        reason: "scanner_unavailable",
      }),
    );
  }
}
