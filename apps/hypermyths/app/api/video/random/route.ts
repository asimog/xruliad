import { NextRequest, NextResponse } from "next/server";
import { createPromptVideoJob } from "@/lib/jobs/repository";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { logger } from "@/lib/logging/logger";
import { getSingleClipVideoSeconds } from "@/lib/video/simple-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const RATE_LIMIT_RULES = [
  { name: "random_video_per_day", windowSec: 86_400, limit: 5 },
] as const;

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);

    const rateLimit = await enforceRateLimit({
      scope: "api_video_random",
      key: ip,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. You have reached your daily limit for random videos.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    const job = await createPromptVideoJob({
      requestKind: "generic_cinema",
      packageType: "30s",
      subjectName: "Random Cinema",
      subjectDescription:
        "Create an original 12-second cinematic short with full directorial freedom. It can be mythic, funny, surreal, futuristic, documentary-like, romantic, or chaotic, but it should feel intentional, visually coherent, and built to stick in memory.",
      requestedPrompt:
        "You are the autonomous director. Invent the premise, genre, visual world, and emotional turn. Build one strong 12-second arc with a memorable opening image and a final frame that feels shareable.",
      videoSeconds: getSingleClipVideoSeconds(),
      audioEnabled: true,
      visibility: "public",
      pricingMode: "public",
      experience: "hyperm",
      paymentWaived: true,
    });

    await triggerJobProcessingSoft({
      jobId: job.jobId,
      logContext: {
        event: "random_video_trigger_deferred",
        component: "api",
        route: "/api/video/random",
      },
    });

    logger.info("random_video_queued", {
      component: "api",
      route: "/api/video/random",
      jobId: job.jobId,
      ip,
    });

    return NextResponse.json({
      jobId: job.jobId,
      status: "pending",
    });
  } catch (error) {
    logger.error("random_video_failed", {
      component: "api",
      errorCode: "random_video_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to generate random video" },
      { status: 500 },
    );
  }
}
