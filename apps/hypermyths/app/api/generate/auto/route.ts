// Auto-detect input and create the right job — the vending machine API.
// Accepts any string: @handle, token contract, or empty (random).
// Always free, always public, always 30s default.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logging/logger";
import {
  createPromptVideoJob,
  createTokenVideoJob,
} from "@/lib/jobs/repository";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import {
  detectAutoInputType,
  type AutoInputType,
} from "@/lib/jobs/auto-input";
import { getSingleClipVideoSeconds } from "@/lib/video/simple-prompt";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow the in-process phase-1 single-clip pipeline to finish.

const RANDOM_PROMPTS = [
  "A synthetic prophet broadcasts warnings from a flooded neon city and nobody can tell if the visions are real.",
  "A dead mall arcade wakes up after midnight and decides to produce its own mythic trailer.",
  "A luxury space hotel drifts past Saturn while one guest quietly plans an impossible escape.",
  "A small town receives a weather report from thirty years in the future and starts changing overnight.",
  "A lost VHS tape contains a trailer for an event that has not happened yet.",
];

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }
    const input = String(body.input ?? "").trim();
    const ip = getRequestIp(request);

    // Rate limit: 10 per hour per IP
    const rateLimit = await enforceRateLimit({
      scope: "auto_generate",
      key: ip,
      rules: [
        { name: "auto_per_minute", windowSec: 60, limit: 3 },
        { name: "auto_per_hour", windowSec: 3600, limit: 10 },
      ],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Try again soon.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec) },
        },
      );
    }

    const type: AutoInputType = detectAutoInputType(input);
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    let jobId: string;
    let detectedAs: string;
    let requestedPrompt: string | null = null;

    if (type === "random") {
      const prompt =
        RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
      const job = await createPromptVideoJob({
        requestKind: "generic_cinema",
        packageType: "30s",
        subjectName: "Random Cinema",
        subjectDescription: prompt,
        requestedPrompt: prompt,
        videoSeconds: getSingleClipVideoSeconds(),
        paymentWaived: true,
      });
      jobId = job.jobId;
      detectedAs = "random";
      requestedPrompt = prompt;
    } else if (type === "prompt") {
      const prompt = input;
      const job = await createPromptVideoJob({
        requestKind: "generic_cinema",
        packageType: "30s",
        subjectName: "Prompt Cinema",
        subjectDescription: prompt,
        requestedPrompt: prompt,
        videoSeconds: getSingleClipVideoSeconds(),
        paymentWaived: true,
      });
      jobId = job.jobId;
      detectedAs = "prompt";
      requestedPrompt = prompt;
    } else if (type === "mythx") {
      const handle = input.startsWith("@")
        ? input
        : input.startsWith("http")
          ? input
          : `@${input}`;
      const job = await createPromptVideoJob({
        requestKind: "mythx",
        packageType: "30s",
        subjectName: handle,
        sourceMediaUrl: input.startsWith("http")
          ? input
          : `https://x.com/${handle.replace("@", "")}`,
        sourceMediaProvider: "x",
        videoSeconds: getSingleClipVideoSeconds(),
        paymentWaived: true,
        experience: "mythx",
      });
      jobId = job.jobId;
      detectedAs = "mythx";
      requestedPrompt = handle;
    } else {
      // Memecoin mode — resolve token metadata first, best-effort
      let subjectName: string | null = null;
      let subjectSymbol: string | null = null;
      let subjectImage: string | null = null;
      let subjectDescription: string | null = null;
      let chain: import("@/lib/types/domain").SupportedTokenChain = "solana";

      try {
        const meta = await resolveMemecoinMetadata({
          address: input,
          chain: "auto",
        });
        subjectName = meta.name;
        subjectSymbol = meta.symbol;
        subjectImage = meta.image;
        subjectDescription = meta.description;
        chain = meta.chain;
      } catch {
        // proceed with nulls — worker will retry
      }

      const job = await createTokenVideoJob({
        tokenAddress: input,
        packageType: "30s",
        subjectChain: chain,
        subjectName,
        subjectSymbol,
        subjectImage,
        subjectDescription,
        paymentWaived: true,
      });
      jobId = job.jobId;
      detectedAs = "hashmyth";
      requestedPrompt = subjectDescription ?? input;
    }

    // Best-effort dispatch; never block this endpoint on long-running generation.
    await triggerJobProcessingSoft({
      jobId,
      logContext: { event: "auto_generate_trigger_deferred", component: "api" },
    });

    logger.info("auto_generate_created", {
      component: "api",
      jobId,
      detectedAs,
      input: input.slice(0, 64),
    });

    return NextResponse.json({
      jobId,
      jobUrl: `${appBaseUrl}/job/${jobId}`,
      detectedAs,
      requestedPrompt,
    });
  } catch (error) {
    logger.error("auto_generate_failed", {
      component: "api",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Generation failed",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
