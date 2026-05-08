import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { getTrailerAssetByJobId } from "@/lib/assets/repository";
import { serializeTrailerAsset } from "@/lib/assets/serializer";
import {
  claimJobRecoveryLock,
  getJobArtifacts,
  releaseJobRecoveryLock,
} from "@/lib/jobs/repository";
import { getActivePayShCheckout } from "@/lib/pay/intermediary";
import { recoverJobIfNeeded } from "@/lib/jobs/recovery";
import { isEphemeralProviderUrl, isStorageConfigured } from "@/lib/storage/s3";
import type { JobDocument, ReportDocument } from "@/lib/types/domain";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = {
  params: Promise<{ jobId: string }>;
};

const PUBLIC_FAILURE_MESSAGE =
  "Video generation is temporarily unavailable. Please try again shortly.";

function sanitizePublicErrorMessage(message: string | null | undefined): string | null {
  if (!message) return null;

  const normalized = message.toLowerCase();
  if (
    normalized.includes("openrouter") ||
    normalized.includes("huggingface") ||
    normalized.includes("eliza") ||
    normalized.includes("xai") ||
    normalized.includes("api key") ||
    normalized.includes("bearer") ||
    normalized.includes("quota") ||
    normalized.includes("credit") ||
    normalized.includes("<html") ||
    normalized.includes("cannot post") ||
    normalized.includes("provider") ||
    normalized.includes("stack")
  ) {
    return PUBLIC_FAILURE_MESSAGE;
  }

  return message;
}

function serializeJobForClient(job: JobDocument) {
  const isPrivate = job.visibility === "private";
  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    requestKind: job.requestKind,
    visibility: job.visibility,
    experience: job.experience,
    moderationStatus: job.moderationStatus,
    subjectChain: job.subjectChain,
    subjectName: job.subjectName,
    subjectSymbol: job.subjectSymbol,
    subjectImage: job.subjectImage,
    subjectDescription: job.subjectDescription,
    sourceMediaUrl: job.sourceMediaUrl,
    sourceEmbedUrl: job.sourceEmbedUrl,
    sourceMediaProvider: job.sourceMediaProvider,
    stylePreset: job.stylePreset,
    sceneCount: job.sceneCount,
    audioEnabled: job.audioEnabled,
    packageType: job.packageType,
    rangeDays: job.rangeDays,
    videoSeconds: job.videoSeconds,
    paymentWaived: job.paymentWaived,
    paymentMethod: job.paymentMethod,
    paymentCurrency: job.paymentCurrency,
    paymentNetwork: job.paymentNetwork,
    paymentAddress: job.paymentAddress,
    paymentRouting: job.paymentRouting,
    requiredLamports: job.requiredLamports?.toString(),
    receivedLamports: job.receivedLamports?.toString(),
    sweepStatus: job.sweepStatus,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    errorMessage:
      isPrivate ? job.errorMessage : sanitizePublicErrorMessage(job.errorMessage),
    ...(isPrivate
      ? {
          creatorEmail: job.creatorEmail,
          subjectAddress: job.subjectAddress,
          pricingMode: job.pricingMode,
          errorCode: job.errorCode,
          requestedPrompt: job.requestedPrompt,
          sourceTranscript: job.sourceTranscript,
        }
      : {}),
  };
}

function serializeReportForClient(report: ReportDocument | null, job: JobDocument) {
  if (!report) return null;
  const isPrivate = job.visibility === "private";

  return {
    jobId: report.jobId,
    rangeDays: report.rangeDays,
    subjectKind: report.subjectKind,
    visibility: report.visibility,
    experience: report.experience,
    moderationStatus: report.moderationStatus,
    subjectChain: report.subjectChain,
    subjectName: report.subjectName,
    subjectSymbol: report.subjectSymbol,
    subjectImage: report.subjectImage,
    subjectDescription: report.subjectDescription,
    sourceMediaUrl: report.sourceMediaUrl,
    sourceEmbedUrl: report.sourceEmbedUrl,
    sourceMediaProvider: report.sourceMediaProvider,
    sourceReference: report.sourceReference
      ? {
          url: report.sourceReference.url,
          title: report.sourceReference.title,
          provider: report.sourceReference.provider,
          authorName: report.sourceReference.authorName,
          thumbnailUrl: report.sourceReference.thumbnailUrl,
          referenceMode: report.sourceReference.referenceMode,
        }
      : null,
    stylePreset: report.stylePreset,
    styleLabel: report.styleLabel,
    durationSeconds: report.durationSeconds,
    audioEnabled: report.audioEnabled,
    tokenLinks: report.tokenLinks,
    marketSnapshot: report.marketSnapshot,
    summary: report.summary,
    downloadUrl: report.downloadUrl,
    narrativeSummary: report.narrativeSummary,
    ...(isPrivate
      ? {
          subjectAddress: report.subjectAddress,
          pricingMode: report.pricingMode,
          storyBeats: report.storyBeats,
          storyCards: report.storyCards,
          sourceTranscript: report.sourceTranscript,
          continuationPrompt: report.continuationPrompt,
        }
      : {}),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export async function GET(request: NextRequest, context: Context) {
  const { jobId } = await context.params;

  const wait = async (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const isDbPoolOverload = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("maxclientsinsessionmode") ||
      normalized.includes("max clients reached") ||
      normalized.includes("remaining connection slots are reserved") ||
      normalized.includes("too many clients")
    );
  };

  try {
    let artifacts:
      | Awaited<ReturnType<typeof getJobArtifacts>>
      | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        artifacts = await getJobArtifacts(jobId);
        break;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (!isDbPoolOverload(message) || attempt === 2) {
          throw error;
        }
        await wait(150 * (attempt + 1));
      }
    }

    if (!artifacts) {
      throw lastError instanceof Error ? lastError : new Error("Failed to load job artifacts");
    }

    const { job } = artifacts;
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const access = await authorizePrivateJobAccess({
      request,
      job,
      route: "/api/jobs/[jobId]",
    });
    if (!access.ok) {
      return access.response;
    }

    // Recover missing or non-durable finalized video state. We trigger recovery
    // when either (a) the video row is missing its URL entirely, or (b) the
    // stored URL points at a provider CDN that will expire / needs auth
    // (OpenRouter, Replicate, xAI, …) — those should be re-uploaded to our
    // Supabase bucket before being served to users.
    const needsRecovery =
      job.status === "complete" &&
      (!artifacts.video?.videoUrl ||
        (isStorageConfigured() &&
          isEphemeralProviderUrl(artifacts.video.videoUrl)));
    if (needsRecovery) {
      const claimedRecovery = await claimJobRecoveryLock(jobId);
      if (claimedRecovery) {
        try {
          const recovered = await recoverJobIfNeeded(jobId);
          if (recovered) {
            artifacts = await getJobArtifacts(jobId);
          }
        } catch {
          // Fall back to current artifacts.
        } finally {
          await releaseJobRecoveryLock(jobId);
        }
      }
    }

    const { job: finalJob, report, video } = artifacts;
    // Asset lookup is non-critical: a missing or erroring trailer asset row
    // must never cause the core job status endpoint to 500.
    let asset = null;
    try {
      asset = await getTrailerAssetByJobId(jobId);
    } catch {
      // Omit asset from response; job status is unaffected.
    }
    const checkout = await getActivePayShCheckout(jobId).catch(() => null);
    return NextResponse.json({
      job: serializeJobForClient(finalJob!),
      report: serializeReportForClient(report, finalJob!),
      video,
      asset: serializeTrailerAsset(asset),
      checkout,
      status: finalJob!.status,
      progress: finalJob!.progress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (isDbPoolOverload(message)) {
      // Keep job pages usable under DB pressure.
      const nowIso = new Date().toISOString();
      return NextResponse.json(
        {
          job: {
            jobId,
            status: "processing",
            progress: "pending",
            requestKind: null,
            subjectName: null,
            subjectSymbol: null,
            subjectDescription: null,
            requestedPrompt: null,
            createdAt: nowIso,
            updatedAt: nowIso,
            errorMessage:
              "Database is under heavy load. Showing degraded status while retrying.",
          },
          report: null,
          video: null,
          asset: null,
          status: "processing",
          progress: "pending",
          degraded: true,
          message,
        },
        {
          status: 200,
          headers: {
            "x-job-fetch-degraded": "1",
            "retry-after": "3",
          },
        },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch trailer", message },
      { status: 500 },
    );
  }
}
