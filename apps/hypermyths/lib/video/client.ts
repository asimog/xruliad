// Video client — direct xAI generation with polling
import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";

// xAI valid sizes: 848x480, 1696x960, 1280x720, 1920x1080
const XAI_VIDEO_SIZE = "1280x720";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface XAiStartResponse {
  id?: string;
  request_id?: string;
  video_url?: string;
}

interface XAiStatusResponse {
  id?: string;
  request_id?: string;
  status?: string;
  state?: string;
  video?: { url?: string };
  video_url?: string;
  error?: string | { message?: string };
}

function findVideoUrl(payload: unknown): string | null {
  if (
    typeof payload === "string" &&
    /^https?:\/\//i.test(payload) &&
    /(mp4|mov|webm)(\?|$)/i.test(payload)
  ) {
    return payload;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findVideoUrl(item);
      if (found) return found;
    }
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    // xAI returns: { video: { url: "..." } }
    if (obj.video && typeof obj.video === "object") {
      const videoObj = obj.video as Record<string, unknown>;
      if (
        typeof videoObj.url === "string" &&
        /^https?:\/\//i.test(videoObj.url)
      ) {
        return videoObj.url;
      }
    }
    // Check video_url, videoUrl fields first
    for (const key of ["video_url", "videoUrl", "url"]) {
      const val = obj[key];
      if (typeof val === "string" && /^https?:\/\//i.test(val)) {
        return val;
      }
    }
    // Search all fields
    for (const [key, val] of Object.entries(obj)) {
      if (key.toLowerCase().includes("video")) {
        const found = findVideoUrl(val);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * Send video to xAI for generation, poll until done.
 * Uses direct xAI API — no intermediate service.
 */
export async function renderCinematicVideo(params: {
  jobId: string;
  wallet: string;
  durationSeconds: number;
  prompt: string;
  script?: unknown;
  xai?: unknown;
}): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const env = getEnv();

  const apiKey = env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY;
  const baseUrl = (env.XAI_VIDEO_BASE_URL ?? env.XAI_BASE_URL)?.replace(
    /\/+$/,
    "",
  );

  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured.");
  }
  if (!baseUrl) {
    throw new Error("XAI_BASE_URL is not configured.");
  }

  const model = env.XAI_VIDEO_MODEL ?? "grok-imagine-video";
  const duration = Math.max(
    3,
    Math.min(10, Math.floor(params.durationSeconds)),
  );

  logger.info("video_client_starting_xai_render", {
    component: "video_client",
    jobId: params.jobId,
    model,
    duration,
    prompt: params.prompt.slice(0, 100),
  });

  // Start generation
  const startResponse = await withRetry(
    async () => {
      const response = await fetchWithTimeout(
        `${baseUrl}/videos/generations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt: params.prompt,
            size: XAI_VIDEO_SIZE,
            duration_seconds: duration,
          }),
        },
        45_000,
      );

      if (!response.ok) {
        const body = await response.text();
        const msg = `xAI video start failed (${response.status}): ${body}`;
        if (isRetryableHttpStatus(response.status))
          throw new RetryableError(msg);
        throw new Error(msg);
      }

      return response;
    },
    { attempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
  );

  const startPayload = (await startResponse.json()) as XAiStartResponse;

  // Check for immediate video URL (sync response)
  const immediateUrl = findVideoUrl(startPayload);
  if (immediateUrl) {
    logger.info("video_client_xai_sync_result", {
      component: "video_client",
      jobId: params.jobId,
    });
    return { videoUrl: immediateUrl, thumbnailUrl: null };
  }

  // Get request ID for polling
  const requestId = startPayload.request_id ?? startPayload.id;
  if (!requestId) {
    throw new Error("xAI did not return a request ID.");
  }

  logger.info("video_client_polling_xai", {
    component: "video_client",
    jobId: params.jobId,
    requestId,
  });

  // Poll for completion
  const maxAttempts = env.VIDEO_RENDER_MAX_POLL_ATTEMPTS ?? 180;
  const pollInterval = env.VIDEO_RENDER_POLL_INTERVAL_MS ?? 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(pollInterval);

    let statusResponse: Response;
    try {
      statusResponse = await withRetry(
        async () => {
          const response = await fetchWithTimeout(
            `${baseUrl}/videos/${encodeURIComponent(requestId)}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            },
            15_000,
          );

          if (!response.ok) {
            const body = await response.text();
            const msg = `xAI status check failed (${response.status}): ${body || "empty"}`;
            if (isRetryableHttpStatus(response.status))
              throw new RetryableError(msg);
            throw new Error(msg);
          }

          return response;
        },
        { attempts: 2, baseDelayMs: 500, maxDelayMs: 2000 },
      );
    } catch (error) {
      // Transient errors — keep polling
      if (error instanceof RetryableError || error instanceof TypeError)
        continue;
      throw error;
    }

    const poll = (await statusResponse.json()) as XAiStatusResponse;
    const status = (poll.status ?? poll.state ?? "").toLowerCase();

    if (status === "failed" || status === "error" || status === "cancelled") {
      const errorMsg =
        typeof poll.error === "string"
          ? poll.error
          : (poll.error?.message ?? "xAI render failed");
      throw new Error(errorMsg);
    }

    const videoUrl = findVideoUrl(poll);
    if (videoUrl) {
      logger.info("video_client_xai_complete", {
        component: "video_client",
        jobId: params.jobId,
        videoUrl: videoUrl.slice(0, 100),
        attempts: attempt + 1,
      });
      return { videoUrl, thumbnailUrl: null };
    }

    if (
      status === "succeeded" ||
      status === "completed" ||
      status === "ready"
    ) {
      throw new Error("xAI render complete but videoUrl is missing.");
    }

    // Still processing — continue polling
    if (attempt > 0 && attempt % 12 === 0) {
      logger.info("video_client_xai_still_processing", {
        component: "video_client",
        jobId: params.jobId,
        attempt: attempt + 1,
        status,
      });
    }
  }

  throw new Error(
    `Video rendering timed out after ${maxAttempts} polling attempts (${Math.round((maxAttempts * pollInterval) / 60000)} minutes).`,
  );
}
