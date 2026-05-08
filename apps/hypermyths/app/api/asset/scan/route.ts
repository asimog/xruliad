import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { fallbackAssetResult } from "@/lib/asset-analysis/report";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { createPayShCheckout } from "@/lib/pay/intermediary";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const payloadSchema = z.object({
  topic: z.string().trim().min(2).max(240),
  rail: z.enum(["solana_sol", "x402_usdc"]).optional(),
});

const RATE_LIMIT_RULES = [
  { name: "asset_scan_per_day", windowSec: 86_400, limit: 10 },
] as const;

function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, " ").slice(0, 240);
}

export async function POST(request: NextRequest) {
  let requestedTopic: string | null = null;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      topic?: unknown;
      rail?: unknown;
    };
    requestedTopic = typeof body.topic === "string" ? body.topic.trim() : null;

    const rateLimit = await enforceRateLimit({
      scope: "api_asset_scan",
      key: getRequestIp(request),
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(fallbackAssetResult(requestedTopic, "rate_limited"));
    }

    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fallbackAssetResult(requestedTopic, "invalid_topic"));
    }

    const env = getEnv();
    const rail = parsed.data.rail ?? "solana_sol";
    if (!env.PAY_SH_ENABLED) {
      return NextResponse.json(
        { error: "Pay.sh asset scans are not enabled." },
        { status: 503 },
      );
    }
    if (rail === "solana_sol" && !env.PAY_SH_SOLANA_ENABLED) {
      return NextResponse.json(
        { error: "Solana Pay.sh checkout is not enabled." },
        { status: 503 },
      );
    }
    if (rail === "x402_usdc" && !env.PAY_SH_X402_ENABLED) {
      return NextResponse.json(
        { error: "x402 Pay.sh checkout is not enabled." },
        { status: 503 },
      );
    }

    const topic = normalizeTopic(parsed.data.topic);
    const jobId = randomUUID();
    const now = new Date();
    const job = await db.job.create({
      data: {
        jobId,
        wallet: `asset:${topic.slice(0, 80)}`,
        status: "awaiting_payment",
        progress: "awaiting_payment",
        requestKind: "asset_scan",
        pricingMode: "public",
        visibility: "public",
        experience: "hyperm",
        moderationStatus: "visible",
        subjectAddress: topic,
        subjectChain: null,
        subjectName: topic,
        subjectSymbol: null,
        subjectImage: null,
        subjectDescription: `Pay.sh asset scan for ${topic}`,
        requestedPrompt: `Asset scan: ${topic}`,
        audioEnabled: false,
        packageType: "30s",
        rangeDays: 1,
        priceSol: 0,
        priceUsdc: 0,
        videoSeconds: 0,
        paymentWaived: false,
        paymentAddress: "pending",
        paymentRouting: "dedicated_address",
        requiredLamports: BigInt(0),
        createdAt: now,
        updatedAt: now,
      },
    });

    const checkout = await createPayShCheckout({
      job: {
        jobId: job.jobId,
        wallet: job.wallet,
        requestKind: "asset_scan",
        pricingMode: "public",
        visibility: "public",
        experience: "hyperm",
        moderationStatus: "visible",
        subjectAddress: topic,
        subjectChain: null,
        subjectName: topic,
        subjectSymbol: null,
        subjectImage: null,
        subjectDescription: `Pay.sh asset scan for ${topic}`,
        requestedPrompt: `Asset scan: ${topic}`,
        audioEnabled: false,
        packageType: "30s",
        rangeDays: 1,
        priceSol: 0,
        priceUsdc: 0,
        videoSeconds: 0,
        status: "awaiting_payment",
        progress: "awaiting_payment",
        txSignature: null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        errorCode: null,
        errorMessage: null,
        paymentWaived: false,
      },
      kind: "asset_scan",
      rail,
      input: { topic },
    });

    return NextResponse.json({
      jobId,
      status: "awaiting_payment",
      topic,
      checkout,
      payment: checkout.payment,
      quote: checkout.quote,
    });
  } catch (error) {
    logger.error("asset_scan_quote_failed", {
      component: "api_asset_scan",
      stage: "post",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Failed to create Pay.sh asset scan checkout.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
