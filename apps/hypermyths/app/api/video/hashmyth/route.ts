import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTokenVideoJob } from "@/lib/jobs/repository";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

function withDeprecatedHeaders(response: NextResponse): NextResponse {
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", "2026-06-30");
  response.headers.set(
    "Link",
    '</api/video/create>; rel="successor-version"',
  );
  response.headers.set(
    "Warning",
    '299 - "Deprecated route. Use /api/video/create with inputType=contract_address and pipeline=hypermyths_generic_engine."',
  );
  return response;
}

const memecoinSchema = z.object({
  address: z.string().min(1, "Token contract is required"),
  chain: z.enum(["auto", "solana", "ethereum", "bsc", "base"]).default("auto"),
  prompt: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const body = await request.json();
    const validation = memecoinSchema.safeParse(body);

    if (!validation.success) {
      return withDeprecatedHeaders(NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      ));
    }

    const { address, chain, prompt } = validation.data;

    const rateLimit = await enforceRateLimit({
      scope: "api_video_hashmyth_coin",
      key: ip,
      rules: [{ name: "hashmyth_coin_per_day", windowSec: 86_400, limit: 10 }],
    });

    if (!rateLimit.allowed) {
      return withDeprecatedHeaders(NextResponse.json(
        {
          error:
            "Rate limit exceeded. This token has reached its daily limit.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      ));
    }

    const token = await resolveMemecoinMetadata({
      address,
      chain,
    });

    const job = await createTokenVideoJob({
      tokenAddress: address,
      packageType: "30s",
      subjectChain: token.chain,
      subjectName: token.name,
      subjectSymbol: token.symbol,
      subjectImage: token.image,
      subjectDescription: token.description,
      requestedPrompt: prompt?.trim() || null,
      audioEnabled: true,
      visibility: "public",
      pricingMode: "public",
      experience: "hashmyth",
      paymentWaived: true,
    });

    await triggerJobProcessingSoft({
      jobId: job.jobId,
      logContext: {
        event: "hashmyth_video_trigger_deferred",
        component: "api",
        route: "/api/video/hashmyth",
      },
    });

    logger.info("hashmyth_coin_video_queued", {
      component: "api",
      route: "/api/video/hashmyth",
      jobId: job.jobId,
      address,
      chain: token.chain,
    });

    return withDeprecatedHeaders(NextResponse.json({
      jobId: job.jobId,
      status: "pending",
      requestedPrompt: prompt?.trim() || null,
      deprecatedRoute: "/api/video/hashmyth",
      successorRoute: "/api/video/create",
    }));
  } catch (error) {
    logger.error("hashmyth_video_failed", {
      component: "api",
      errorCode: "hashmyth_video_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return withDeprecatedHeaders(NextResponse.json(
      { error: "Failed to generate memecoin video" },
      { status: 500 },
    ));
  }
}
