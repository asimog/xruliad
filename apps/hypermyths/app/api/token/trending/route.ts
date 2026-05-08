import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTrendingTokens, scannerChainSchema } from "@/lib/chat/token-scanner";
import { logger } from "@/lib/logging/logger";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const querySchema = z.object({
  chain: scannerChainSchema.optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const RATE_LIMIT_RULES = [
  { name: "token_trending_per_minute", windowSec: 60, limit: 20 },
  { name: "token_trending_per_hour", windowSec: 3_600, limit: 180 },
] as const;

export async function GET(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_token_trending",
      key: ip,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Trending rate limit exceeded.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trending request.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(await getTrendingTokens(parsed.data));
  } catch (error) {
    logger.error("token_trending_failed", {
      component: "api_token_trending",
      stage: "get",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trending tokens failed." },
      { status: 500 },
    );
  }
}
