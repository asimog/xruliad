import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

import {
  createPromptVideoJob,
  createTokenVideoJob,
  createWalletRecapJob,
} from "@/lib/jobs/repository";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { createPayShCheckout } from "@/lib/pay/intermediary";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import {
  buildContractDirection,
  buildProfileDirection,
  buildWalletDirection,
  publicVideoInputTypeSchema,
  videoChainSchema,
} from "@/lib/video/create-route-helpers";
import { normalizeXProfileInput } from "@/lib/x/api";

export const runtime = "nodejs";
export const maxDuration = 300;

const publicCreateVideoSchema = z.object({
  inputType: publicVideoInputTypeSchema,
  value: z.string().trim().min(1, "Input is required."),
  chain: videoChainSchema.default("auto"),
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
    pipeline: "two_act_cinema",
    jobUrl: input.jobUrl,
    requestedPrompt: input.requestedPrompt,
    checkout,
    payment: checkout.payment,
    quote: checkout.quote,
  });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = publicCreateVideoSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { inputType, value, chain } = parsed.data;
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_video_public_create",
      key: `${ip}:${inputType}`,
      rules: [{ name: "public_video_one_per_day", windowSec: 86_400, limit: 1 }],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Public generation is limited to one 2-act video every 24 hours per IP.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

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
        pipeline: "two_act_cinema",
      });

      const job = await createPromptVideoJob({
        requestKind: "mythx",
        packageType: "30s",
        subjectName: `@${normalized.username}`,
        subjectDescription: `Public 2-act profile cinema for @${normalized.username}.`,
        sourceMediaUrl:
          normalized.profileUrl ?? `https://x.com/${normalized.username}`,
        sourceMediaProvider: "x",
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
          event: "public_video_create_trigger_deferred",
          component: "api",
          route: "/api/video/public-create",
        },
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        inputType,
        pipeline: "two_act_cinema",
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
      });

      const job = await createWalletRecapJob({
        wallet: value,
        packageType: "30s",
        subjectName: `Wallet ${value.slice(0, 6)}...${value.slice(-4)}`,
        subjectDescription: "Public 2-act wallet trailer for the last 24 hours of Solana activity.",
        requestedPrompt,
        audioEnabled: true,
        visibility: "public",
        pricingMode: "public",
        experience: "two_act_cinema",
        paymentWaived: true,
      });

      const checkoutResponse = await maybeReturnPayShVideoCheckout({
        job,
        inputType,
        jobUrl: `${appBaseUrl}/job/${job.jobId}`,
        requestedPrompt,
      });
      if (checkoutResponse) return checkoutResponse;

      await triggerJobProcessingSoft({
        jobId: job.jobId,
        logContext: {
          event: "public_video_create_trigger_deferred",
          component: "api",
          route: "/api/video/public-create",
        },
      });

      return NextResponse.json({
        jobId: job.jobId,
        status: "pending",
        inputType,
        pipeline: "two_act_cinema",
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
      pipeline: "two_act_cinema",
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
      visibility: "public",
      pricingMode: "public",
      experience: "two_act_cinema",
      paymentWaived: true,
    });

    const checkoutResponse = await maybeReturnPayShVideoCheckout({
      job,
      inputType,
      jobUrl: `${appBaseUrl}/job/${job.jobId}`,
      requestedPrompt,
    });
    if (checkoutResponse) return checkoutResponse;

    await triggerJobProcessingSoft({
      jobId: job.jobId,
      logContext: {
        event: "public_video_create_trigger_deferred",
        component: "api",
        route: "/api/video/public-create",
      },
    });

    return NextResponse.json({
      jobId: job.jobId,
      status: "pending",
      inputType,
      pipeline: "two_act_cinema",
      jobUrl: `${appBaseUrl}/job/${job.jobId}`,
      requestedPrompt,
    });
  } catch (error) {
    logger.error("public_video_create_failed", {
      component: "api",
      route: "/api/video/public-create",
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to create public video job." },
      { status: 500 },
    );
  }
}
