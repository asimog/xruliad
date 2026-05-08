import {
  createPromptVideoJob,
  createTokenVideoJob,
  deleteFailedJobs,
  findRecentReusableTokenJob,
} from "@/lib/jobs/repository";
import { getPrivySessionUserId, requirePrivyAuth } from "@/lib/auth/privy-server";
import { getEnv } from "@/lib/env";
import { createPayShCheckout } from "@/lib/pay/intermediary";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { getPackageConfig } from "@/lib/packages";
import { secureCompare } from "@/lib/security/crypto";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import {
  CinemaExperience,
  CinemaPricingMode,
  CinemaVisibility,
  JobDocument,
  PackageType,
  RequestedTokenChain,
  SupportedTokenChain,
  VideoStyleId,
} from "@/lib/types/domain";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCinemaPackageConfig } from "@/lib/cinema/config";
import {
  getDefaultStylePresetForExperience,
  videoStyleSchema,
} from "@/lib/styles/video-style-validation";

export const runtime = "nodejs";

const sharedCinemaSchema = z.object({
  packageType: z.enum(["30s", "60s"]),
  stylePreset: videoStyleSchema.optional(),
  requestedPrompt: z.string().max(4_000).optional(),
  audioEnabled: z.boolean().optional(),
  pricingMode: z.enum(["legacy", "public", "private"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  experience: z
    .enum([
      "legacy",
      "hypercinema",
      "two_act_cinema",
      "hyperm",
      "mythx",
      "trenchcinema",
      "funcinema",
      "familycinema",
      "musicvideo",
      "recreator",
      "hashmyth",
      "lovex",
    ])
    .optional(),
});

const tokenVideoSchema = sharedCinemaSchema.extend({
  requestKind: z.literal("token_video").optional(),
  tokenAddress: z.string().min(32).max(64),
  chain: z.enum(["auto", "solana", "ethereum", "bsc", "base"]).default("auto"),
  subjectDescription: z.string().max(1_200).optional(),
});

const promptVideoSchema = sharedCinemaSchema.extend({
  requestKind: z.enum([
    "generic_cinema",
    "mythx",
    "bedtime_story",
    "music_video",
    "scene_recreation",
  ]),
  subjectName: z.string().min(2).max(120),
  subjectDescription: z.string().max(4_000).optional(),
  sourceMediaUrl: z.string().url().max(1_500).optional(),
  sourceEmbedUrl: z.string().url().max(1_500).optional(),
  sourceMediaProvider: z.string().max(64).optional(),
  sourceTranscript: z.string().max(12_000).optional(),
});

const createJobSchema = z.union([tokenVideoSchema, promptVideoSchema]);

const JOB_RATE_LIMIT_RULES = [
  { name: "jobs_per_minute", windowSec: 60, limit: 5 },
  { name: "jobs_per_hour", windowSec: 60 * 60, limit: 20 },
] as const;

type CreateJobPayload = z.infer<typeof createJobSchema>;

interface CreateJobResponse {
  jobId: string;
  priceSol: number;
  paymentAddress?: string | null;
  amountSol?: number;
  paymentRequired: boolean;
  tokenAddress?: string | null;
  chain?: RequestedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  stylePreset?: VideoStyleId | null;
  pricingMode?: CinemaPricingMode;
  visibility?: CinemaVisibility;
  experience?: CinemaExperience;
  checkout?: Awaited<ReturnType<typeof createPayShCheckout>>;
  payment?: Awaited<ReturnType<typeof createPayShCheckout>>["payment"];
  quote?: Awaited<ReturnType<typeof createPayShCheckout>>["quote"];
}

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

function isPromptPayload(
  payload: CreateJobPayload,
): payload is z.infer<typeof promptVideoSchema> {
  return (
    payload.requestKind === "generic_cinema" ||
    payload.requestKind === "mythx" ||
    payload.requestKind === "bedtime_story" ||
    payload.requestKind === "music_video" ||
    payload.requestKind === "scene_recreation"
  );
}

function resolvePricing(input: {
  packageType: PackageType;
  pricingMode?: CinemaPricingMode;
}) {
  if (input.pricingMode === "public" || input.pricingMode === "private") {
    return getCinemaPackageConfig({
      packageType: input.packageType,
      pricingMode: input.pricingMode,
    });
  }

  return getPackageConfig(input.packageType);
}

function normalizeVisibility(input: {
  pricingMode?: CinemaPricingMode;
  visibility?: CinemaVisibility;
  requestKind?: CreateJobPayload["requestKind"];
}): CinemaVisibility {
  if (input.pricingMode === "private" || input.visibility === "private") {
    return "private";
  }

  return "public";
}

function normalizeExperience(input: {
  experience?: CinemaExperience;
  requestKind?: CreateJobPayload["requestKind"];
  visibility: CinemaVisibility;
}): CinemaExperience {
  if (
    input.experience === "legacy" ||
    input.experience === "hypercinema" ||
    input.experience === "two_act_cinema" ||
    input.experience === "hyperm" ||
    input.experience === "mythx" ||
    input.experience === "trenchcinema" ||
    input.experience === "funcinema" ||
    input.experience === "familycinema" ||
    input.experience === "musicvideo" ||
    input.experience === "recreator" ||
    input.experience === "hashmyth" ||
    input.experience === "lovex"
  ) {
    return input.experience;
  }

  if (input.requestKind === "token_video") {
    return "hashmyth";
  }

  if (
    input.experience === "two_act_cinema" ||
    input.experience === "three_act_cinema"
  ) {
    return "two_act_cinema";
  }

  if (input.requestKind === "mythx") {
    return "mythx";
  }

  if (input.requestKind === "bedtime_story") {
    return "familycinema";
  }

  if (input.requestKind === "music_video") {
    return "musicvideo";
  }

  if (input.requestKind === "scene_recreation") {
    return "recreator";
  }

  return input.visibility === "private" ? "funcinema" : "hyperm";
}

function createJobResponse(input: {
  job: JobDocument;
  chain?: RequestedTokenChain | null;
  checkout?: Awaited<ReturnType<typeof createPayShCheckout>>;
}): CreateJobResponse {
  return {
    jobId: input.job.jobId,
    priceSol: input.checkout?.quote.totalSol ?? input.job.priceSol,
    paymentAddress: input.checkout?.payment.paymentAddress ?? input.job.paymentAddress ?? null,
    amountSol: input.checkout?.payment.amountSol ?? input.job.priceSol,
    paymentRequired: !input.job.paymentWaived,
    tokenAddress: input.job.subjectAddress ?? null,
    chain: input.chain ?? input.job.subjectChain ?? null,
    subjectName: input.job.subjectName ?? null,
    subjectSymbol: input.job.subjectSymbol ?? null,
    subjectImage: input.job.subjectImage ?? null,
    stylePreset: input.job.stylePreset ?? null,
    pricingMode: input.job.pricingMode ?? "legacy",
    visibility: input.job.visibility ?? "public",
    experience: input.job.experience ?? "legacy",
    checkout: input.checkout,
    payment: input.checkout?.payment,
    quote: input.checkout?.quote,
  };
}

async function maybeCreatePayShVideoCheckout(job: JobDocument) {
  const env = getEnv();
  if (!env.PAY_SH_ENABLED || !env.PAY_SH_REQUIRE_FOR_VIDEO) return undefined;
  return createPayShCheckout({
    job,
    kind: "video_generation",
    input: {
      requestKind: job.requestKind,
      subjectName: job.subjectName,
      requestedPrompt: job.requestedPrompt,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const ip = getRequestIp(request);
    const rateLimitKey = isPromptPayload(payload)
      ? `${ip}:${payload.subjectName.toLowerCase()}`
      : `${ip}:${payload.tokenAddress.toLowerCase()}`;

    const rateLimit = await enforceRateLimit({
      scope: "api_jobs_post",
      key: rateLimitKey,
      rules: [...JOB_RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfterSec: rateLimit.retryAfterSec,
          rule: rateLimit.exceededRule,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        },
      );
    }

    const pricingMode = payload.pricingMode ?? "legacy";
    const visibility = normalizeVisibility({
      pricingMode,
      visibility: payload.visibility,
      requestKind: payload.requestKind,
    });
    const experience = normalizeExperience({
      experience: payload.experience,
      requestKind: payload.requestKind,
      visibility,
    });

    let creatorId: string | null = null;
    if (visibility === "private" || pricingMode === "private") {
      const auth = await requirePrivyAuth(request);
      if (!auth.ok) {
        return auth.response;
      }
      creatorId = getPrivySessionUserId(auth.session);
    }

    const pkg = resolvePricing({
      packageType: payload.packageType as PackageType,
      pricingMode,
    });
    const defaultStylePreset = getDefaultStylePresetForExperience(experience);

    if (!isPromptPayload(payload)) {
      // Best-effort metadata resolution — worker can retry if this fails
      let resolved = {
        chain:
          (payload.chain === "auto"
            ? "solana"
            : payload.chain) as SupportedTokenChain,
        name: null as string | null,
        symbol: null as string | null,
        image: null as string | null,
        description: null as string | null,
      };

      try {
        resolved = await resolveMemecoinMetadata({
          address: payload.tokenAddress,
          chain: payload.chain,
        });
      } catch {
        // Proceed with nulls — worker will enrich later
      }

      const canReuseLegacy =
        pricingMode === "legacy" &&
        visibility === "public" &&
        (payload.requestKind ?? "token_video") === "token_video";

      if (canReuseLegacy) {
        const reusableJob = await findRecentReusableTokenJob({
          tokenAddress: payload.tokenAddress,
          packageType: payload.packageType as PackageType,
          subjectChain: resolved.chain,
          stylePreset: (payload.stylePreset ??
            defaultStylePreset) as VideoStyleId,
          requestedPrompt: payload.requestedPrompt?.trim() || null,
          maxAgeMinutes: 20,
        });

        if (reusableJob) {
          return NextResponse.json(
            createJobResponse({
              job: reusableJob,
              chain: reusableJob.subjectChain ?? resolved.chain,
            }),
          );
        }
      }

      const job = await createTokenVideoJob({
        tokenAddress: payload.tokenAddress,
        packageType: payload.packageType as PackageType,
        subjectChain: resolved.chain,
        subjectName: resolved.name,
        subjectSymbol: resolved.symbol,
        subjectImage: resolved.image,
        subjectDescription:
          payload.subjectDescription?.trim() || resolved.description,
        stylePreset: (payload.stylePreset ??
          defaultStylePreset) as VideoStyleId,
        requestedPrompt: payload.requestedPrompt?.trim() || null,
        audioEnabled: payload.audioEnabled,
        pricingMode,
        visibility,
        experience,
        creatorId,
        priceSol: pkg.priceSol,
        priceUsdc: pkg.priceUsdc,
        videoSeconds: pkg.videoSeconds,
        rangeDays: pkg.rangeDays,
      });
      const checkout = await maybeCreatePayShVideoCheckout(job);

      return NextResponse.json(
        createJobResponse({
          job,
          chain: job.subjectChain ?? resolved.chain,
          checkout,
        }),
      );
    }

    const job = await createPromptVideoJob({
      requestKind: payload.requestKind,
      packageType: payload.packageType as PackageType,
      subjectName: payload.subjectName,
      subjectDescription: payload.subjectDescription?.trim() || null,
      sourceMediaUrl: payload.sourceMediaUrl?.trim() || null,
      sourceEmbedUrl: payload.sourceEmbedUrl?.trim() || null,
      sourceMediaProvider: payload.sourceMediaProvider?.trim() || null,
      sourceTranscript: payload.sourceTranscript?.trim() || null,
      stylePreset: (payload.stylePreset ?? defaultStylePreset) as VideoStyleId,
      requestedPrompt: payload.requestedPrompt?.trim() || null,
      audioEnabled: payload.audioEnabled,
      pricingMode,
      visibility,
      experience,
      creatorId,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
      videoSeconds: pkg.videoSeconds,
      rangeDays: pkg.rangeDays,
    });
    const checkout = await maybeCreatePayShVideoCheckout(job);

    return NextResponse.json(
      createJobResponse({
        job,
        chain: null,
        checkout,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("valid Solana mint") ||
      message.includes("EVM-formatted") ||
      message.includes("support the Solana chain")
        ? 400
        : 500;
    return NextResponse.json(
      { error: "Failed to create trailer", message },
      { status },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminSecret = getEnv().ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET not configured" },
      { status: 503 },
    );
  }

  const token = extractBearer(request.headers.get("authorization"));
  if (!token || !secureCompare(token, adminSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  if (status !== "failed") {
    return NextResponse.json(
      {
        error: "Only failed jobs can be deleted",
        requiredStatus: "failed",
      },
      { status: 400 },
    );
  }

  const limitParam = url.searchParams.get("limit");
  const parsedLimit =
    limitParam === null ? 25 : Number.parseInt(limitParam, 10);
  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return NextResponse.json(
      { error: "limit must be a positive integer" },
      { status: 400 },
    );
  }

  const result = await deleteFailedJobs({ limit: parsedLimit });
  return NextResponse.json({
    ok: true,
    deletedCount: result.deletedCount,
    deletedJobIds: result.deletedJobIds,
    deletedStatus: "failed",
  });
}
