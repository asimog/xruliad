import { generateReportSummary } from "../lib/ai/report";
import { getEnv } from "../lib/env";
import {
  beginJobProcessing,
  getJob,
  markDispatchJobSuccess,
  markJobFailed,
  rescheduleDispatchJob,
  updateJob,
  updateJobProgress,
  updateJobStatus,
  upsertReport,
  upsertVideo,
} from "../lib/jobs/repository";
import { logger } from "../lib/logging/logger";
import { JobDocument, JobProgress, ReportDocument } from "../lib/types/domain";
import { buildAndRenderVideo } from "../lib/video/pipeline";
import {
  extractS3KeyFromUrl,
  isEphemeralProviderUrl,
  isStorageConfigured,
  uploadVideoToStorage,
} from "../lib/storage/s3";
import { recoverJobIfNeeded } from "../lib/jobs/recovery";
import { publishCompletedJobToMoltBook } from "../lib/social/moltbook-publisher";
import { analyzeAsset } from "../lib/asset-analysis/engine";
import { buildAssetReport, fallbackAssetResult } from "../lib/asset-analysis/report";
import { resolveMemecoinMetadata } from "../lib/memecoins/metadata";
import { buildTokenVideoArtifacts } from "../lib/memecoins/story";
import { buildPromptVideoArtifacts } from "../lib/generators/story";
import { fetchXProfileTweets, normalizeXProfileInput } from "../lib/x/api";
import { generateMultiActVideo } from "./multi-act-pipeline";
import { analyzeWalletProfile } from "../lib/analytics";
import { adaptWalletAnalysisToLegacyArtifacts } from "../lib/analytics/legacy-adapter";
import {
  buildMultiActVideoPrompt,
  buildSingleClipVideoPrompt,
  resolveSingleClipDurationSeconds,
} from "../lib/video/simple-prompt";
import { renderCinematicVideoWithFallback } from "../lib/video/dispatcher";
import { X_PROFILE_TWEET_LIMIT } from "../lib/x/constants";
import { ensurePayShJobIsPaid, isPayShBackedRequestKind } from "../lib/pay/intermediary";

const STAGE_HEARTBEAT_MS = 15_000;
const EXTERNAL_API_TIMEOUT_MS = 3 * 60_000;
const UPLOAD_STAGE_TIMEOUT_MS = 3 * 60_000;
const MOLTBOOK_PUBLISH_TIMEOUT_MS = 30_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function markDispatchSuccessBestEffort(jobId: string): Promise<void> {
  try {
    await markDispatchJobSuccess(jobId);
  } catch (error) {
    logger.warn("dispatch_success_mark_failed", {
      component: "worker",
      stage: "dispatch_outbox",
      jobId,
      errorMessage: errorMessage(error),
    });
  }
}

async function rescheduleDispatchBestEffort(
  jobId: string,
  error: unknown,
): Promise<void> {
  try {
    await rescheduleDispatchJob(jobId, errorMessage(error));
  } catch (dispatchError) {
    logger.warn("dispatch_reschedule_failed", {
      component: "worker",
      stage: "dispatch_outbox",
      jobId,
      errorMessage: errorMessage(dispatchError),
    });
  }
}

async function timedStage<T>(
  context: {
    jobId: string;
    wallet: string;
  },
  stage: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  logger.info("pipeline_stage_started", {
    component: "worker",
    stage,
    jobId: context.jobId,
    wallet: context.wallet,
  });

  try {
    const result = await fn();
    logger.info("pipeline_stage_completed", {
      component: "worker",
      stage,
      jobId: context.jobId,
      wallet: context.wallet,
      durationMs: Date.now() - started,
    });
    return result;
  } catch (error) {
    logger.error("pipeline_stage_failed", {
      component: "worker",
      stage,
      jobId: context.jobId,
      wallet: context.wallet,
      durationMs: Date.now() - started,
      errorCode: "stage_failure",
      errorMessage: errorMessage(error),
    });
    throw error;
  }
}

function stageTimedOutMessage(stage: string, timeoutMs: number): string {
  return `Stage '${stage}' timed out after ${timeoutMs}ms`;
}

function buildMultiActTokenPrompt(input: {
  job: JobDocument;
  report: ReportDocument;
  sceneCount: number;
}): string {
  return [
    input.job.subjectName ? `Subject: ${input.job.subjectName}.` : null,
    input.job.subjectDescription
      ? `Brief: ${input.job.subjectDescription}`
      : null,
    input.job.requestedPrompt
      ? `Creative direction: ${input.job.requestedPrompt}`
      : null,
    input.report.summary ? `Story summary: ${input.report.summary}` : null,
    input.report.narrativeSummary
      ? `Narrative spine: ${input.report.narrativeSummary}`
      : null,
    input.job.sourceTranscript
      ? `Reference transcript: ${input.job.sourceTranscript}`
      : null,
    `Format: a stitched ${input.sceneCount}-part cinematic short with exactly ${input.sceneCount} scenes: an opening setup${input.sceneCount > 2 ? `, ${input.sceneCount - 2} middle acts,` : ""} and a climactic final reveal.`,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

async function withTimeout<T>(input: {
  stage: string;
  timeoutMs: number;
  operation: () => Promise<T>;
}): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(stageTimedOutMessage(input.stage, input.timeoutMs)));
    }, input.timeoutMs);
  });

  try {
    return await Promise.race([input.operation(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function withProgressHeartbeat<T>(input: {
  jobId: string;
  progress:
    | "fetching_transactions"
    | "filtering_pump_activity"
    | "generating_report"
    | "generating_script"
    | "generating_video"
    | "rendering_scenes"
    | "stitching_video"
    | "uploading_assets";
  operation: () => Promise<T>;
}): Promise<T> {
  let cancelled = false;
  const interval = setInterval(() => {
    if (cancelled) return;
    void updateJobProgress(input.jobId, input.progress).catch((error) => {
      // CRITICAL FIX: Wrap logger in try-catch to prevent logger errors from
      // becoming unhandled rejections that crash the worker
      try {
        logger.warn("pipeline_stage_heartbeat_failed", {
          component: "worker",
          stage: input.progress,
          jobId: input.jobId,
          errorCode: "pipeline_stage_heartbeat_failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (logError) {
        // Logger itself failed - don't let this crash the worker
        console.error("Failed to log heartbeat error:", logError);
      }
    });
  }, STAGE_HEARTBEAT_MS);

  try {
    return await input.operation();
  } finally {
    cancelled = true;
    clearInterval(interval);
  }
}

async function uploadRenderedAssets(input: {
  jobId: string;
  context: { jobId: string; wallet: string };
  rendered: {
    videoUrl: string;
    thumbnailUrl: string | null;
    totalDuration?: number;
  };
  report: ReportDocument;
}): Promise<{
  storedVideoUrl: string;
  reportUrl: string;
  thumbnailUrl: string | null;
}> {
  return withProgressHeartbeat({
    jobId: input.jobId,
    progress: "uploading_assets",
    operation: async () => {
      await updateJobProgress(input.jobId, "uploading_assets");

      return withTimeout({
        stage: "upload_assets",
        timeoutMs: UPLOAD_STAGE_TIMEOUT_MS,
        operation: async () => {
          // Upload video and thumbnail to Supabase. If S3 is not configured we
          // fall back to the original URL (dev only). If S3 IS configured, the
          // upload must succeed or throw — we never persist an ephemeral
          // provider CDN URL as the final artifact.
          const finalVideoKey = `video-renders/${input.jobId}/final.mp4`;
          const existingVideoKey = extractS3KeyFromUrl(
            input.rendered.videoUrl,
          );
          const storedVideoUrl =
            existingVideoKey === finalVideoKey
              ? input.rendered.videoUrl
              : await uploadVideoToStorage(
                  input.rendered.videoUrl,
                  finalVideoKey,
                );
          if (
            isStorageConfigured() &&
            isEphemeralProviderUrl(storedVideoUrl)
          ) {
            throw new Error(
              `Refusing to persist ephemeral provider URL as final video: ${storedVideoUrl.slice(
                0,
                120,
              )}`,
            );
          }
          const finalThumbKey = `video-renders/${input.jobId}/thumbnail.jpg`;
          const existingThumbKey = input.rendered.thumbnailUrl
            ? extractS3KeyFromUrl(input.rendered.thumbnailUrl)
            : null;
          const thumbnailUrl = input.rendered.thumbnailUrl
            ? existingThumbKey === finalThumbKey
              ? input.rendered.thumbnailUrl
              : await uploadVideoToStorage(
                  input.rendered.thumbnailUrl,
                  finalThumbKey,
                )
            : null;
          // PDF served from DB via /api/report/:jobId
          const reportUrl = `/api/report/${input.jobId}`;

          return {
            storedVideoUrl,
            reportUrl,
            thumbnailUrl,
          };
        },
      });
    },
  });
}

function resolveRenderedDurationSeconds<T extends object>(
  rendered: T & {
    totalDuration?: number;
  },
  fallbackDurationSeconds: number,
): number {
  const duration =
    typeof rendered.totalDuration === "number" &&
    Number.isFinite(rendered.totalDuration)
      ? rendered.totalDuration
      : fallbackDurationSeconds;
  return Math.max(1, Math.round(duration));
}

function parseExperienceList(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function resolveSceneCount(job: JobDocument): number {
  const runtime = getEnv();
  if (job.experience === "two_act_cinema") {
    return 2;
  }
  const requested = job.sceneCount ?? runtime.VIDEO_STITCH_SCENE_COUNT;
  return Math.max(3, Math.min(10, requested));
}

// A job is routed through the multi-act stitch pipeline when (a) the engine is
// configured to render more than one scene and (b) the job's experience is in
// the allowlist. Otherwise the single-clip path is used.
function isMultiActPipeline(job: JobDocument): boolean {
  const runtime = getEnv();
  if (job.experience === "two_act_cinema") return true;
  if ((job.sceneCount ?? 0) >= 3) return true;
  if (runtime.VIDEO_STITCH_SCENE_COUNT < 3) return false;
  const allowed = parseExperienceList(runtime.VIDEO_STITCH_EXPERIENCES);
  // If no allowlist is configured we default to the classic stitched contract
  // so we don't silently change behaviour for deployments that don't set the var.
  if (allowed.size === 0) {
    // Default allowlist covers the existing stitched experiences plus mythx,
    // which now acts as the generic multi-act pipeline across input types.
    return job.experience === "mythx";
  }
  return job.experience != null && allowed.has(job.experience);
}

async function processTokenVideoJob(input: {
  job: JobDocument;
}): Promise<void> {
  const tokenAddress = input.job.subjectAddress ?? input.job.wallet;
  const context = {
    jobId: input.job.jobId,
    wallet: tokenAddress,
  };

  await updateJobProgress(input.job.jobId, "fetching_transactions");
  const token = await timedStage(context, "resolve_token_metadata", () =>
    withTimeout({
      stage: "resolve_token_metadata",
      timeoutMs: EXTERNAL_API_TIMEOUT_MS,
      operation: () =>
        resolveMemecoinMetadata({
          address: tokenAddress,
          chain: input.job.subjectChain ?? "auto",
        }),
    }),
  );

  await updateJob(input.job.jobId, {
    subjectAddress: token.address,
    subjectChain: token.chain,
    subjectName: token.name,
    subjectSymbol: token.symbol,
    subjectImage: token.image,
    subjectDescription: token.description,
  });

  const enrichedJob: JobDocument = {
    ...input.job,
    subjectAddress: token.address,
    subjectChain: token.chain,
    subjectName: token.name,
    subjectSymbol: token.symbol,
    subjectImage: token.image,
    subjectDescription: token.description,
  };

  await updateJobProgress(input.job.jobId, "generating_report");
  const computed = buildTokenVideoArtifacts({
    job: enrichedJob,
    token,
  });

  const summary = await timedStage(
    context,
    "generate_report_summary",
    async () => generateReportSummary(computed.report),
  );

  const report: ReportDocument = {
    ...computed.report,
    summary,
    downloadUrl: null,
  };

  await upsertReport(report);

  await updateJobProgress(input.job.jobId, "generating_script");
  await updateJobProgress(input.job.jobId, "generating_video");
  await upsertVideo({
    jobId: input.job.jobId,
    videoUrl: null,
    thumbnailUrl: null,
    duration: enrichedJob.videoSeconds,
    renderStatus: "queued",
  });

  const useMultiAct = isMultiActPipeline(enrichedJob);
  const sceneCount = resolveSceneCount(enrichedJob);
  const rendered = await withProgressHeartbeat({
    jobId: input.job.jobId,
    progress: useMultiAct ? "rendering_scenes" : "generating_video",
    operation: async () =>
      timedStage(
        context,
        useMultiAct
          ? "render_multi_act_token_video"
          : "build_and_render_video",
        async () => {
          if (useMultiAct) {
            return generateMultiActVideo({
              jobId: input.job.jobId,
              sceneCount,
              prompt: buildMultiActTokenPrompt({
                job: enrichedJob,
                report,
                sceneCount,
              }),
              imageUrl: token.image ?? undefined,
              onProgress: (progress) =>
                updateJobProgress(input.job.jobId, progress as JobProgress),
            });
          }

          return buildAndRenderVideo({
            jobId: input.job.jobId,
            walletStory: computed.story,
            imageUrl: token.image ?? undefined,
          });
        },
      ),
  });

  const { storedVideoUrl, reportUrl, thumbnailUrl } =
    await uploadRenderedAssets({
      jobId: input.job.jobId,
      context,
      rendered,
      report,
    });
  const finalDurationSeconds = resolveRenderedDurationSeconds(
    rendered,
    enrichedJob.videoSeconds,
  );

  // CRITICAL FIX: Validate all critical writes before marking job complete
  // Report failure = critical data loss. Video failure = degraded but acceptable
  const [reportResult, videoResult, statusResult] = await Promise.allSettled([
    upsertReport({
      ...report,
      downloadUrl: reportUrl,
    }),
    upsertVideo({
      jobId: input.job.jobId,
      videoUrl: storedVideoUrl,
      thumbnailUrl,
      duration: finalDurationSeconds,
      renderStatus: "ready",
    }),
    updateJobStatus(input.job.jobId, "complete", {
      progress: "complete",
      errorCode: null,
      errorMessage: null,
    }),
  ]);

  // CRITICAL: Fail job if report write fails (data integrity requirement)
  if (reportResult.status === "rejected") {
    logger.error("final_upsert_report_failed_critical", {
      component: "worker",
      jobId: input.job.jobId,
      errorMessage: errorMessage(reportResult.reason),
      reason: "Report upsert is critical - job cannot be marked complete",
    });
    
    // Mark job failed to allow retry
    try {
      await markJobFailed(input.job.jobId, "report_upsert_failed", 
        `Failed to persist report: ${errorMessage(reportResult.reason)}`);
    } catch (failError) {
      logger.error("failed_to_mark_job_failed_after_report_error", {
        component: "worker",
        jobId: input.job.jobId,
        errorMessage: errorMessage(failError),
      });
    }
    throw new Error(`Critical failure: Report upsert failed for job ${input.job.jobId}`);
  }

  // MEDIUM: Log video failure but allow job completion
  if (videoResult.status === "rejected") {
    logger.error("final_upsert_video_failed", {
      component: "worker",
      jobId: input.job.jobId,
      errorMessage: errorMessage(videoResult.reason),
      note: "Video upsert failed but report succeeded - job marked complete",
    });
  }

  // CRITICAL: Verify job status was updated
  if (statusResult.status === "rejected") {
    logger.error("final_update_job_status_failed_critical", {
      component: "worker",
      jobId: input.job.jobId,
      errorMessage: errorMessage(statusResult.reason),
      reason: "Job status update failed - job state inconsistent",
    });
    throw new Error(`Critical failure: Could not mark job complete for ${input.job.jobId}`);
  }
}

async function processPromptVideoJob(input: {
  job: JobDocument;
}): Promise<void> {
  const context = {
    jobId: input.job.jobId,
    wallet: input.job.wallet,
  };

  let job = input.job;
  if (job.requestKind === "mythx") {
    const profileInput =
      job.sourceMediaUrl?.trim() || job.subjectName?.trim() || "";

    if (profileInput) {
      try {
        const profile = await withTimeout({
          stage: "fetch_x_profile_tweets",
          timeoutMs: EXTERNAL_API_TIMEOUT_MS,
          operation: () =>
            fetchXProfileTweets({
              profileInput,
              maxTweets: X_PROFILE_TWEET_LIMIT,
            }),
        });

        const normalized = normalizeXProfileInput(profileInput);
        const subjectName =
          profile.profile.displayName ||
          (normalized.username
            ? `@${normalized.username}`
            : (job.subjectName ?? "X profile"));
        const sourceMediaUrl = profile.profile.profileUrl;
        const sourceTranscript = profile.transcript;
        const sourceMediaProvider = "x";

        await updateJob(job.jobId, {
          subjectName,
          sourceMediaUrl,
          sourceMediaProvider,
          sourceTranscript,
          subjectDescription:
            job.subjectDescription?.trim() ||
            `Biography-first MythX short about @${profile.profile.username}, built from the last ${X_PROFILE_TWEET_LIMIT} tweets with focus on voice, identity, and contradictions.`,
        });

        job = {
          ...job,
          subjectName,
          sourceMediaUrl,
          sourceMediaProvider,
          sourceTranscript,
          subjectDescription:
            job.subjectDescription?.trim() ||
            `Biography-first MythX short about @${profile.profile.username}, built from the last ${X_PROFILE_TWEET_LIMIT} tweets with focus on voice, identity, and contradictions.`,
        };
      } catch (error) {
        logger.warn("mythx_profile_hydration_failed", {
          component: "worker",
          stage: "hydrate_mythx_profile",
          jobId: job.jobId,
          wallet: job.wallet,
          errorCode: "mythx_profile_hydration_failed",
          errorMessage: errorMessage(error),
        });
      }
    }
  }

  await updateJobProgress(job.jobId, "generating_report");
  const computed = await withTimeout({
    stage: "build_prompt_video_artifacts",
    timeoutMs: EXTERNAL_API_TIMEOUT_MS,
    operation: () => buildPromptVideoArtifacts({ job }),
  });

  const summary = await timedStage(
    context,
    "generate_report_summary",
    async () => generateReportSummary(computed.report),
  );

  const report: ReportDocument = {
    ...computed.report,
    summary,
    downloadUrl: null,
  };

  const isMultiActExperience = isMultiActPipeline(job);
  const sceneCount = resolveSceneCount(job);
  const renderDurationSeconds = resolveSingleClipDurationSeconds(
    job.videoSeconds,
  );
  const queuedDurationSeconds = isMultiActExperience
    ? Math.max(1, Math.round(job.videoSeconds || 30))
    : renderDurationSeconds;

  await upsertReport(report);

  await updateJobProgress(job.jobId, "generating_script");
  await updateJobProgress(job.jobId, "generating_video");
  await upsertVideo({
    jobId: job.jobId,
    videoUrl: null,
    thumbnailUrl: null,
    duration: queuedDurationSeconds,
    renderStatus: "queued",
  });

  logger.info("video_pipeline_selected", {
    component: "worker",
    jobId: job.jobId,
    requestKind: job.requestKind,
    experience: job.experience,
    pipeline: isMultiActExperience ? "multi_act_stitch" : "single_clip",
    queuedDurationSeconds,
    renderDurationSeconds,
  });

  const rendered = await withProgressHeartbeat({
    jobId: job.jobId,
    progress: isMultiActExperience ? "rendering_scenes" : "generating_video",
    operation: async () =>
      timedStage(
        context,
        isMultiActExperience
          ? "render_multi_act_prompt_video"
          : "render_single_prompt_video",
        async () => {
          if (isMultiActExperience) {
            return generateMultiActVideo({
              jobId: job.jobId,
              sceneCount,
              prompt: buildMultiActVideoPrompt({
                job,
                report,
                sceneCount,
              }),
              imageUrl: job.subjectImage ?? undefined,
              onProgress: (progress) =>
                updateJobProgress(job.jobId, progress as JobProgress),
            });
          }

          const prompt = buildSingleClipVideoPrompt({
            job,
            report,
          });

          return renderCinematicVideoWithFallback({
            jobId: job.jobId,
            wallet: job.wallet,
            durationSeconds: renderDurationSeconds,
            prompt,
            subjectName: job.subjectName,
            sourceTranscript: job.sourceTranscript,
            imageUrl: job.subjectImage ?? undefined,
          });
        },
      ),
  });

  const { storedVideoUrl, reportUrl, thumbnailUrl } =
    await uploadRenderedAssets({
      jobId: job.jobId,
      context,
      rendered,
      report,
    });
  const finalDurationSeconds = resolveRenderedDurationSeconds(
    rendered,
    renderDurationSeconds,
  );

  // Report write is best-effort; video URL and job status are critical.
  const [reportResult, videoUpsertResult, statusResult] =
    await Promise.allSettled([
      upsertReport({
        ...report,
        downloadUrl: reportUrl,
      }),
      upsertVideo({
        jobId: job.jobId,
        videoUrl: storedVideoUrl,
        thumbnailUrl,
        duration: finalDurationSeconds,
        renderStatus: "ready",
      }),
      updateJobStatus(job.jobId, "complete", {
        progress: "complete",
        errorCode: null,
        errorMessage: null,
      }),
    ]);

  if (reportResult.status === "rejected") {
    logger.error("final_upsert_report_failed", {
      component: "worker",
      jobId: job.jobId,
      errorMessage: errorMessage(reportResult.reason),
    });
  }
  if (videoUpsertResult.status === "rejected") {
    logger.error("final_upsert_video_failed", {
      component: "worker",
      jobId: job.jobId,
      errorMessage: errorMessage(videoUpsertResult.reason),
    });
  }
  if (statusResult.status === "rejected") {
    logger.error("final_update_job_status_failed", {
      component: "worker",
      jobId: job.jobId,
      errorMessage: errorMessage(statusResult.reason),
    });
  }

  // If either critical write failed, surface the error so processJob marks the
  // dispatch as failed rather than silently stranding a job with no video.
  if (videoUpsertResult.status === "rejected" || statusResult.status === "rejected") {
    const reason =
      videoUpsertResult.status === "rejected"
        ? videoUpsertResult.reason
        : statusResult.status === "rejected"
          ? statusResult.reason
          : undefined;
    throw new Error(
      `Critical final write failed: ${errorMessage(reason)}`,
    );
  }
}

async function processWalletRecapJob(input: {
  job: JobDocument;
}): Promise<void> {
  const context = {
    jobId: input.job.jobId,
    wallet: input.job.wallet,
  };

  await updateJobProgress(input.job.jobId, "fetching_transactions");
  const analysis = await timedStage(context, "analyze_wallet_profile", () =>
    withTimeout({
      stage: "analyze_wallet_profile",
      timeoutMs: EXTERNAL_API_TIMEOUT_MS,
      operation: () =>
        analyzeWalletProfile({
          wallet: input.job.wallet,
          rangeHours: 24,
        }),
    }),
  );

  await updateJobProgress(input.job.jobId, "generating_report");
  const adapted = adaptWalletAnalysisToLegacyArtifacts({
    jobId: input.job.jobId,
    wallet: input.job.wallet,
    rangeDays: input.job.rangeDays,
    packageType: input.job.packageType,
    durationSeconds: input.job.videoSeconds,
    analysis,
    analysisEngine: "v2",
  });

  const reportBase: ReportDocument = {
    ...adapted.report,
    subjectKind: "wallet_recap",
    pricingMode: input.job.pricingMode,
    visibility: input.job.visibility,
    experience: input.job.experience,
    moderationStatus: input.job.moderationStatus,
    creatorId: input.job.creatorId,
    creatorEmail: input.job.creatorEmail,
    subjectAddress: input.job.wallet,
    subjectChain: "solana",
    subjectName: input.job.subjectName,
    subjectDescription: input.job.subjectDescription,
    sourceMediaProvider: "helius",
    sourceTranscript:
      "Wallet trailer generated from Helius transaction history across the last 24 hours and token metadata from DexScreener.",
    summary: "",
    downloadUrl: null,
  };

  const summary = await timedStage(
    context,
    "generate_report_summary",
    async () => generateReportSummary(reportBase),
  );

  const report: ReportDocument = {
    ...reportBase,
    summary,
  };

  await upsertReport(report);

  await updateJobProgress(input.job.jobId, "generating_script");
  await updateJobProgress(input.job.jobId, "generating_video");
  await upsertVideo({
    jobId: input.job.jobId,
    videoUrl: null,
    thumbnailUrl: null,
    duration: input.job.videoSeconds,
    renderStatus: "queued",
  });

  const rendered = await withProgressHeartbeat({
    jobId: input.job.jobId,
    progress: "generating_video",
    operation: async () =>
      timedStage(context, "render_wallet_trailer", () =>
        buildAndRenderVideo({
          jobId: input.job.jobId,
          walletStory: adapted.story,
        }),
      ),
  });

  const { storedVideoUrl, reportUrl, thumbnailUrl } =
    await uploadRenderedAssets({
      jobId: input.job.jobId,
      context,
      rendered,
      report,
    });

  const finalDurationSeconds = resolveRenderedDurationSeconds(
    rendered,
    input.job.videoSeconds,
  );

  const [reportResult, videoResult, statusResult] = await Promise.allSettled([
    upsertReport({
      ...report,
      downloadUrl: reportUrl,
    }),
    upsertVideo({
      jobId: input.job.jobId,
      videoUrl: storedVideoUrl,
      thumbnailUrl,
      duration: finalDurationSeconds,
      renderStatus: "ready",
    }),
    updateJobStatus(input.job.jobId, "complete", {
      progress: "complete",
      errorCode: null,
      errorMessage: null,
    }),
  ]);

  if (reportResult.status === "rejected") {
    logger.error("final_upsert_report_failed", {
      component: "worker",
      jobId: input.job.jobId,
      errorMessage: errorMessage(reportResult.reason),
    });
  }
  if (videoResult.status === "rejected") {
    logger.error("final_upsert_video_failed", {
      component: "worker",
      jobId: input.job.jobId,
      errorMessage: errorMessage(videoResult.reason),
    });
  }
  if (statusResult.status === "rejected") {
    logger.error("final_update_job_status_failed", {
      component: "worker",
      jobId: input.job.jobId,
      errorMessage: errorMessage(statusResult.reason),
    });
  }
}

async function processAssetScanJob(input: { job: JobDocument }): Promise<void> {
  const topic =
    input.job.subjectAddress?.trim() ||
    input.job.subjectName?.trim() ||
    input.job.requestedPrompt?.replace(/^Asset scan:\s*/i, "").trim() ||
    "unknown asset";
  const context = {
    jobId: input.job.jobId,
    wallet: input.job.wallet,
  };

  await updateJobProgress(input.job.jobId, "generating_report");
  const result = await timedStage(context, "run_asset_analysis", async () => {
    try {
      return await analyzeAsset(topic, { jobId: input.job.jobId });
    } catch (error) {
      logger.warn("asset_analysis_fallback", {
        component: "worker",
        stage: "run_asset_analysis",
        jobId: input.job.jobId,
        errorMessage: errorMessage(error),
      });
      return fallbackAssetResult(topic, "scanner_unavailable");
    }
  });

  await upsertReport(buildAssetReport(input.job.jobId, result));
  await updateJob(input.job.jobId, {
    subjectName: result.normalizedTopic,
    subjectAddress: result.normalizedTopic,
    subjectDescription: result.article.summary.join(" "),
  });
  await updateJobStatus(input.job.jobId, "complete", {
    progress: "complete",
    errorCode: null,
    errorMessage: null,
  });
}

export async function processJob(jobId: string): Promise<void> {
  const env = getEnv();

  const current = await getJob(jobId);
  if (!current) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (current.status === "complete") {
    await markDispatchSuccessBestEffort(jobId);
    return;
  }

  if (isPayShBackedRequestKind(current.requestKind) && !current.paymentWaived) {
    await ensurePayShJobIsPaid(current);
  }

  if (
    await recoverJobIfNeeded(jobId, {
      staleAfterMs: env.JOB_PROCESSING_STALE_MS,
      retriggerStale: false,
    })
  ) {
    return;
  }

  const begin = await beginJobProcessing(jobId, {
    staleAfterMs: env.JOB_PROCESSING_STALE_MS,
  });
  if (!begin.job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (!begin.acquired) {
    if (begin.job.status === "complete") {
      await markDispatchSuccessBestEffort(jobId);
    }
    await recoverJobIfNeeded(jobId, {
      staleAfterMs: env.JOB_PROCESSING_STALE_MS,
      retriggerStale: false,
    });
    return;
  }

  const job = begin.job;

  try {
    if (job.requestKind === "asset_scan") {
      await processAssetScanJob({ job });
      await markDispatchSuccessBestEffort(jobId);
      return;
    }

    if (job.requestKind === "token_video") {
      await processTokenVideoJob({ job });
      await markDispatchSuccessBestEffort(jobId);

      try {
        const publication = await withTimeout({
          stage: "publish_moltbook",
          timeoutMs: MOLTBOOK_PUBLISH_TIMEOUT_MS,
          operation: () => publishCompletedJobToMoltBook(jobId),
        });
        if (publication.status === "failed") {
          logger.warn("moltbook_publication_attempt_failed", {
            component: "worker",
            stage: "publish_moltbook",
            jobId,
            wallet: job.wallet,
            errorCode: "moltbook_publication_attempt_failed",
            errorMessage:
              publication.reason ?? "Unknown MoltBook publication error",
          });
        }
      } catch (publicationError) {
        logger.warn("moltbook_publication_attempt_crashed", {
          component: "worker",
          stage: "publish_moltbook",
          jobId,
          wallet: job.wallet,
          errorCode: "moltbook_publication_attempt_crashed",
          errorMessage: errorMessage(publicationError),
        });
      }

      return;
    }

    if (
      job.requestKind === "generic_cinema" ||
      job.requestKind === "mythx" ||
      job.requestKind === "bedtime_story" ||
      job.requestKind === "music_video" ||
      job.requestKind === "scene_recreation"
    ) {
      await processPromptVideoJob({ job });
      await markDispatchSuccessBestEffort(jobId);
      return;
    }

    if (job.requestKind === "wallet_recap") {
      await processWalletRecapJob({ job });
      await markDispatchSuccessBestEffort(jobId);
      return;
    }

    throw new Error(
      `Unsupported request kind "${job.requestKind ?? "unknown"}". Active pipeline only supports mythx, token_video, wallet_recap, and prompt-led cinema modes.`,
    );
  } catch (error) {
    const message = errorMessage(error);
    await markJobFailed(jobId, "pipeline_error", message);
    await rescheduleDispatchBestEffort(jobId, error);
    throw error;
  }
}

if (process.argv[1]?.includes("process-job") && process.argv[2]) {
  processJob(process.argv[2]).catch((error) => {
    logger.error("worker_cli_failed", {
      component: "worker",
      stage: "process_job_cli",
      jobId: process.argv[2],
      errorCode: "worker_cli_failed",
      errorMessage: errorMessage(error),
    });
    process.exit(1);
  });
}
