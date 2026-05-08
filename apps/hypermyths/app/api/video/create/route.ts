import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

import { getPrivySessionUserId, requirePrivyAuth } from "@/lib/auth/privy-server";
import {
  createPromptVideoJob,
  createTokenVideoJob,
  createWalletRecapJob,
} from "@/lib/jobs/repository";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { logger } from "@/lib/logging/logger";
import { getEnv } from "@/lib/env";
import { createPayShCheckout } from "@/lib/pay/intermediary";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import {
  buildContractDirection,
  buildImageDirection,
  buildProfileDirection,
  buildPromptDirection,
  buildWalletDirection,
  resolveExperienceFromPipeline,
  videoChainSchema,
  videoInputTypeSchema,
  videoPipelineSchema,
} from "@/lib/video/create-route-helpers";
import { normalizeXProfileInput } from "@/lib/x/api";

export const runtime = "nodejs";
export const maxDuration = 300;

const createGenericVideoSchema = z.object({
  inputType: videoInputTypeSchema,
  pipeline: videoPipelineSchema.default("two_act_cinema"),
  value: z
    .string()
    .trim()
    .min(1, "Input is required.")
    .max(256, "Input value too long (max 256 characters)"),
  notes: z.string().trim().max(2_000).optional(),
  chain: videoChainSchema.default("auto"),
  sceneCount: z.coerce.number().int().min(3).max(10).optional(),
});

function isValidSolanaWallet(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

async function maybeReturnPayShVideoCheckout(input: {
  job: Awaited<ReturnType<typeof createPromptVideoJob>> | Awaited<ReturnType<typeof createTokenVideoJob>> | Awaited<ReturnType<typeof createWalletRecapJob>>;
  inputType: string;
  pipeline: string;
  jobUrl: string;
  requestedPrompt: string;
}) {
  const env = getEnv();
  if (!env.PAY_SH_ENABLED || !env.PAY_SH_REQUIRE_FOR_VIDEO) return null;
  const checkout = await createPayShCheckout({
    job: input.job,
    kind: "video_generation",
    input: {
      requestKind: input.job.requestKind,
      subjectName: input.job.subjectName,
      requestedPrompt: input.requestedPrompt,
    },
  });
  return NextResponse.json({
    jobId: input.job.jobId,
    status: "awaiting_payment",
    inputType: input.inputType,
    pipeline: input.pipeline,
    jobUrl: input.jobUrl,
    requestedPrompt: input.requestedPrompt,
    checkout,
    payment: checkout.payment,
    quote: checkout.quote,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePrivyAuth(request);
    if (!auth.ok) {
      return auth.response;
    }
    const creatorId = getPrivySessionUserId(auth.session);

    const parsed = createGenericVideoSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { inputType, pipeline, value, notes, chain, sceneCount } = parsed.data;
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_video_create",
      key: `${ip}:${inputType}:${pipeline}`,
      rules: [
        { name: "video_create_per_minute", windowSec: 60, limit: 5 },
        { name: "video_create_per_hour", windowSec: 3600, limit: 20 },
      ],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Try again shortly.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const experience = resolveExperienceFromPipeline(pipeline);

    if (inputType === "prompt") {
      const requestedPrompt = buildPromptDirection({ value, notes, pipeline });
      const job = await createPromptVideoJob({
        requestKind: "generic_cinema",
        packageType: "30s",
        subjectName: "Prompt video",
        subjectDescription: value,
        requestedPrompt,
        audioEnabled: true,
        visibility: "private",
        pricingMode: "private",
        experience:
          pipeline === "hypermyths_generic_engine" ? "funcinema" : experience,
        creatorId,
        sceneCount: pipeline === "hypermyths_generic_engine" ? (sceneCount ?? null) : null,
        paymentWaived: true,
      });

      const checkoutResponse = await maybeReturnPayShVideoCheckout({
        job,
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
      if (checkoutResponse) return checkoutResponse;

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "generic_video_create_trigger_deferred",
          component: "api",
          route: "/api/video/create",
        },
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
    }

    if (inputType === "x_profile") {
      const normalized = normalizeXProfileInput(value);
      if (!normalized.username) {
        return NextResponse.json(
          { error: "Enter a valid X handle or profile URL." },
          { status: 400 },
        );
      }

      const requestedPrompt = buildProfileDirection({
        username: normalized.username,
        notes,
        pipeline,
      });

      const job = await createPromptVideoJob({
        requestKind: "mythx",
        packageType: "30s",
        subjectName: `@${normalized.username}`,
        subjectDescription:
          notes?.trim() ||
          `Profile-based cinematic biography for @${normalized.username}.`,
        sourceMediaUrl:
          normalized.profileUrl ?? `https://x.com/${normalized.username}`,
        sourceMediaProvider: "x",
        requestedPrompt,
        audioEnabled: true,
        visibility: "private",
        pricingMode: "private",
        experience:
          pipeline === "hypermyths_generic_engine" ? "funcinema" : experience,
        creatorId,
        sceneCount: pipeline === "hypermyths_generic_engine" ? (sceneCount ?? null) : null,
        paymentWaived: true,
      });

      const checkoutResponse = await maybeReturnPayShVideoCheckout({
        job,
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
      if (checkoutResponse) return checkoutResponse;

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "generic_video_create_trigger_deferred",
          component: "api",
          route: "/api/video/create",
        },
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
    }

    if (inputType === "wallet_address") {
      if (!isValidSolanaWallet(value)) {
        return NextResponse.json(
          { error: "Enter a valid Solana wallet address." },
          { status: 400 },
        );
      }

      const requestedPrompt = buildWalletDirection({
        wallet: value,
        notes,
      });

      const job = await createWalletRecapJob({
        wallet: value,
        packageType: "30s",
        subjectName: `Wallet ${value.slice(0, 6)}...${value.slice(-4)}`,
        subjectDescription:
          notes?.trim() ||
          "A private trailer generated from the wallet's last 24 hours of Solana activity.",
        requestedPrompt,
        audioEnabled: true,
        visibility: "private",
        pricingMode: "private",
        experience,
        creatorId,
        paymentWaived: true,
      });

      const checkoutResponse = await maybeReturnPayShVideoCheckout({
        job,
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
      if (checkoutResponse) return checkoutResponse;

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "generic_video_create_trigger_deferred",
          component: "api",
          route: "/api/video/create",
        },
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
    }

    if (inputType === "image_url") {
      const imageSchema = z.string().url();
      const imageUrl = imageSchema.safeParse(value);
      if (!imageUrl.success) {
        return NextResponse.json(
          { error: "Enter a valid public image URL." },
          { status: 400 },
        );
      }

      const requestedPrompt = buildImageDirection({
        imageUrl: imageUrl.data,
        notes,
      });

      const job = await createPromptVideoJob({
        requestKind: "generic_cinema",
        packageType: "30s",
        subjectName: "Image trailer",
        subjectImage: imageUrl.data,
        subjectDescription:
          notes?.trim() || "A cinematic trailer built from a single reference image.",
        sourceMediaUrl: imageUrl.data,
        sourceMediaProvider: "image",
        requestedPrompt,
        audioEnabled: true,
        visibility: "private",
        pricingMode: "private",
        experience,
        creatorId,
        paymentWaived: true,
      });

      const checkoutResponse = await maybeReturnPayShVideoCheckout({
        job,
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
      if (checkoutResponse) return checkoutResponse;

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "generic_video_create_trigger_deferred",
          component: "api",
          route: "/api/video/create",
        },
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        inputType,
        pipeline,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
    }

    const token = await resolveMemecoinMetadata({
      address: value,
      chain,
    });
    const requestedPrompt = buildContractDirection({
      tokenName: token.name,
      tokenSymbol: token.symbol,
      chain: token.chain,
      description: token.description,
      notes,
      pipeline,
    });

    const job = await createTokenVideoJob({
      tokenAddress: value,
      packageType: "30s",
      subjectChain: token.chain,
      subjectName: token.name,
      subjectSymbol: token.symbol,
      subjectImage: token.image,
      subjectDescription: token.description,
      requestedPrompt,
      audioEnabled: true,
      visibility: "private",
      pricingMode: "private",
      experience:
        pipeline === "hypermyths_generic_engine" ? "funcinema" : experience,
      creatorId,
      sceneCount: pipeline === "hypermyths_generic_engine" ? (sceneCount ?? null) : null,
      paymentWaived: true,
    });

    const checkoutResponse = await maybeReturnPayShVideoCheckout({
      job,
      inputType,
      pipeline,
      jobUrl: `${appBaseUrl}/job/${job.jobId}`,
      requestedPrompt,
    });
    if (checkoutResponse) return checkoutResponse;

    await triggerJobProcessingSoft({
      jobId: job.jobId,
      logContext: {
        event: "generic_video_create_trigger_deferred",
        component: "api",
        route: "/api/video/create",
      },
    });

    return NextResponse.json({
      jobId: job.jobId,
      status: "pending",
      inputType,
      pipeline,
      jobUrl: `${appBaseUrl}/job/${job.jobId}`,
      requestedPrompt,
    });
  } catch (error) {
    logger.error("generic_video_create_failed", {
      component: "api",
      route: "/api/video/create",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Failed to create video job",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
