import { NextRequest, NextResponse } from "next/server";
import { createPromptVideoJob, createTokenVideoJob } from "@/lib/jobs/repository";
import { detectAutoInputType } from "@/lib/jobs/auto-input";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { normalizeXProfileInput } from "@/lib/x/api";
import { logger } from "@/lib/logging/logger";
import { z } from "zod";

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
    '299 - "Deprecated route kept as a fixed 2-Act Cinema smoke-test. Use /api/video/create for new work."',
  );
  return response;
}

const hyperMythSchema = z.object({
  input: z.string().trim().min(1, "Enter an X handle, prompt, or memecoin address."),
});

const RATE_LIMIT_RULES = [
  { name: "hypermyth_per_minute", windowSec: 60, limit: 3 },
  { name: "hypermyth_per_hour", windowSec: 3600, limit: 12 },
] as const;

function buildHyperMythMythXPrompt(profileInput: string): {
  subjectName: string;
  sourceMediaUrl: string;
  requestedPrompt: string;
  subjectDescription: string;
} {
  const normalized = normalizeXProfileInput(profileInput);
  const username = normalized.username ?? profileInput.replace(/^@/, "").trim();
  const sourceMediaUrl = normalized.profileUrl ?? `https://x.com/${username}`;

  return {
    subjectName: `@${username}`,
    sourceMediaUrl,
    subjectDescription:
      `Two-act HyperMyth cinematic biography for @${username}. ` +
      "Treat the profile as internet folklore: identity, contradictions, recurring obsessions, and the mythic version of the person.",
    requestedPrompt: [
      `HyperMyth subject: @${username}`,
      "Format: two-part cinematic short with an opening setup and final mythic reveal.",
      "Input type: X profile. Use handle identity, public voice, contradictions, recurring topics, and the profile's self-authored mythology.",
      "Direction: turn the profile into a stylized internet biography, not a tweet-by-tweet recap.",
    ].join("\n"),
  };
}

function buildHyperMythPrompt(input: string): string {
  return [
    "HyperMyth format: two-part cinematic short with an opening setup and final reveal.",
    `Core concept: ${input.trim()}`,
    "Direction: make the story feel mythic, internet-native, and visually shareable.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = hyperMythSchema.safeParse(body);

    if (!parsed.success) {
      return withDeprecatedHeaders(NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      ));
    }

    const input = parsed.data.input.trim();
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_video_hypermyth",
      key: `${ip}:${input.toLowerCase()}`,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return withDeprecatedHeaders(NextResponse.json(
        {
          error: "Rate limit exceeded. Try again shortly.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      ));
    }

    const detectedAs = detectAutoInputType(input);

    if (detectedAs === "mythx") {
      const mythx = buildHyperMythMythXPrompt(input);
      const job = await createPromptVideoJob({
        requestKind: "mythx",
        packageType: "30s",
        subjectName: mythx.subjectName,
        subjectDescription: mythx.subjectDescription,
        sourceMediaUrl: mythx.sourceMediaUrl,
        sourceMediaProvider: "x",
        requestedPrompt: mythx.requestedPrompt,
        audioEnabled: true,
        visibility: "public",
        pricingMode: "public",
        experience: "two_act_cinema",
        paymentWaived: true,
      });

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "hypermyth_video_trigger_deferred",
          component: "api",
          route: "/api/video/hypermyth",
        },
      });

      return withDeprecatedHeaders(NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        detectedAs,
        requestedPrompt: mythx.requestedPrompt,
        deprecatedRoute: "/api/video/hypermyth",
        successorRoute: "/api/video/create",
      }));
    }

    if (detectedAs === "hashmyth") {
      const token = await resolveMemecoinMetadata({
        address: input,
        chain: "auto",
      });
      const requestedPrompt = buildHyperMythPrompt(
        `${token.name} (${token.symbol}) on ${token.chain}. ${token.description ?? "Make the token feel like a legendary internet artifact."}`,
      );

      const job = await createTokenVideoJob({
        tokenAddress: input,
        packageType: "30s",
        subjectChain: token.chain,
        subjectName: token.name,
        subjectSymbol: token.symbol,
        subjectImage: token.image,
        subjectDescription: token.description,
        requestedPrompt,
        audioEnabled: true,
        visibility: "public",
        pricingMode: "public",
        experience: "two_act_cinema",
        paymentWaived: true,
      });

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "hypermyth_video_trigger_deferred",
          component: "api",
          route: "/api/video/hypermyth",
        },
      });

      return withDeprecatedHeaders(NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        detectedAs,
        requestedPrompt,
        deprecatedRoute: "/api/video/hypermyth",
        successorRoute: "/api/video/create",
      }));
    }

    const requestedPrompt = buildHyperMythPrompt(input);
    const job = await createPromptVideoJob({
      requestKind: "generic_cinema",
      packageType: "30s",
      subjectName: "HyperMyth",
      subjectDescription: input,
      requestedPrompt,
      audioEnabled: true,
      visibility: "public",
      pricingMode: "public",
      experience: "two_act_cinema",
      paymentWaived: true,
    });

    await triggerJobProcessingSoft({
      jobId: job.jobId,
      logContext: {
        event: "hypermyth_video_trigger_deferred",
        component: "api",
        route: "/api/video/hypermyth",
      },
    });

    logger.info("hypermyth_video_queued", {
      component: "api",
      route: "/api/video/hypermyth",
      jobId: job.jobId,
      detectedAs,
    });

    return withDeprecatedHeaders(NextResponse.json({
      jobId: job.jobId,
      status: "pending",
      detectedAs,
      requestedPrompt,
      deprecatedRoute: "/api/video/hypermyth",
      successorRoute: "/api/video/create",
    }));
  } catch (error) {
    logger.error("hypermyth_video_failed", {
      component: "api",
      route: "/api/video/hypermyth",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return withDeprecatedHeaders(NextResponse.json(
      { error: "Failed to generate HyperMyth video" },
      { status: 500 },
    ));
  }
}
