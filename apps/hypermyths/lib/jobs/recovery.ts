import { publishCompletedJobToMoltBook } from "@/lib/social/moltbook-publisher";
import {
  isEphemeralProviderUrl,
  isStorageConfigured,
  uploadVideoToStorage,
} from "@/lib/storage/s3";
import { InternalVideoRenderDocument } from "@/lib/types/domain";
import {
  getInternalVideoRender,
  getJobArtifacts,
  markJobFailed,
  updateJob,
  updateJobStatus,
  upsertReport,
  upsertVideo,
} from "./repository";
import { triggerJobProcessing } from "./trigger";
import { logger } from "@/lib/logging/logger";

function isStale(updatedAt: string, staleAfterMs: number): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }
  return Date.now() - updatedAtMs >= staleAfterMs;
}

async function finalizeReadyRender(
  jobId: string,
  render: InternalVideoRenderDocument,
): Promise<boolean> {
  const { job, report } = await getJobArtifacts(jobId);
  if (!job || !report || !render.videoUrl) {
    return false;
  }

  const [reportUrl, persistentVideoUrl, publicThumbnailUrl] = await Promise.all(
    [
      report.downloadUrl ? Promise.resolve(report.downloadUrl) : Promise.resolve(null),
      // Upload video to S3 for persistent storage (fail-open: falls back to original URL)
      uploadVideoToStorage(render.videoUrl, `videos/${jobId}.mp4`),
      render.thumbnailUrl ? render.thumbnailUrl : null,
    ],
  );

  await Promise.all([
    upsertReport({
      ...report,
      downloadUrl: reportUrl,
    }),
    upsertVideo({
      jobId,
      videoUrl: persistentVideoUrl,
      thumbnailUrl: publicThumbnailUrl,
      duration: job.videoSeconds,
      renderStatus: "ready",
    }),
    job.status === "failed"
      ? updateJob(jobId, {
          status: "complete",
          progress: "complete",
          errorCode: null,
          errorMessage: null,
        })
      : updateJobStatus(jobId, "complete", {
          progress: "complete",
          errorCode: null,
          errorMessage: null,
        }),
  ]);

  try {
    await publishCompletedJobToMoltBook(jobId);
  } catch (error) {
    // Log the error for monitoring but don't fail the completed job
    logger.error("moltbook_publication_failed_in_recovery", {
      jobId,
      error: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return true;
}

async function syncFailedRender(
  jobId: string,
  render: InternalVideoRenderDocument,
): Promise<boolean> {
  const { job } = await getJobArtifacts(jobId);
  if (!job || job.status !== "processing") {
    return false;
  }

  await markJobFailed(
    jobId,
    "video_render_failed",
    render.error ?? "Video render failed before asset finalization.",
  );
  return true;
}

async function syncInFlightRender(
  jobId: string,
  _render: InternalVideoRenderDocument,
): Promise<boolean> {
  void _render;
  const { job } = await getJobArtifacts(jobId);
  if (!job) {
    return false;
  }

  await Promise.all([
    upsertVideo({
      jobId,
      videoUrl: null,
      thumbnailUrl: null,
      duration: job.videoSeconds,
      renderStatus: "processing",
    }),
    updateJobStatus(jobId, "processing", {
      progress: "generating_video",
      errorCode: null,
      errorMessage: null,
    }),
  ]);

  return true;
}

async function rehydrateEphemeralVideoUrl(
  jobId: string,
  currentUrl: string,
): Promise<boolean> {
  try {
    const persistentUrl = await uploadVideoToStorage(
      currentUrl,
      `videos/${jobId}.mp4`,
    );
    if (persistentUrl === currentUrl) {
      // uploadVideoToStorage returned the source URL, which only happens when
      // S3 isn't configured. Don't overwrite the DB with the same ephemeral URL.
      return false;
    }
    const { job } = await getJobArtifacts(jobId);
    await upsertVideo({
      jobId,
      videoUrl: persistentUrl,
      thumbnailUrl: null,
      duration: job?.videoSeconds ?? 0,
      renderStatus: "ready",
    });
    logger.info("recovery_rehydrated_ephemeral_url", {
      jobId,
      from: currentUrl.slice(0, 100),
      to: persistentUrl.slice(0, 100),
    });
    return true;
  } catch (error) {
    logger.error("recovery_rehydrate_ephemeral_url_failed", {
      jobId,
      errorMessage: error instanceof Error ? error.message : "unknown error",
    });
    return false;
  }
}

export async function recoverJobIfNeeded(
  jobId: string,
  options?: { staleAfterMs?: number; retriggerStale?: boolean },
): Promise<boolean> {
  const staleAfterMs = options?.staleAfterMs ?? 300_000;
  const retriggerStale = options?.retriggerStale ?? true;
  const { job, video } = await getJobArtifacts(jobId);
  if (!job) return false;

  const render = await getInternalVideoRender(jobId);

  // Recover video even on "complete" jobs — process-job.ts uses Promise.allSettled,
  // so job.status can reach "complete" while upsertVideo fails silently.
  if (render?.status === "ready" && !video?.videoUrl) {
    return finalizeReadyRender(jobId, render);
  }

  // Rehydrate jobs whose stored URL points at a provider CDN (e.g. OpenRouter).
  // Those URLs expire and/or require Authorization — they should never be the
  // persisted final artifact once Supabase storage is configured.
  if (
    video?.videoUrl &&
    video.renderStatus === "ready" &&
    isStorageConfigured() &&
    isEphemeralProviderUrl(video.videoUrl)
  ) {
    return rehydrateEphemeralVideoUrl(jobId, video.videoUrl);
  }

  if (job.status === "complete") {
    return false;
  }

  if (
    render &&
    (render.status === "processing" || render.status === "queued") &&
    (job.status === "failed" || job.status === "pending")
  ) {
    return syncInFlightRender(jobId, render);
  }

  if (render?.status === "failed" && job.status === "processing") {
    return syncFailedRender(jobId, render);
  }

  if (job.status === "processing" && isStale(job.updatedAt, staleAfterMs)) {
    logger.warn("recovery_stale_processing_job", {
      jobId,
      updatedAt: job.updatedAt,
      staleAfterMs,
    });

    if (retriggerStale) {
      try {
        await triggerJobProcessing(jobId);
      } catch (error) {
        logger.error("recovery_stale_processing_retrigger_failed", {
          jobId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return false;
  }

  return false;
}
