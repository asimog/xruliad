/**
 * ElizaOS (ElizaCloud) video generation client.
 *
 * API: https://www.elizacloud.ai
 * Auth: Authorization: Bearer <api_key>
 * Endpoint: /api/v1/generate-video
 *
 * Supports multi-model video (MiniMax, Runway, etc.)
 * Cheapest video endpoint available.
 */

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export interface ElizaVideoRequest {
  prompt: string;
  model?: string;
  duration?: number;
  resolution?: string;
  size?: string;
  aspect_ratio?: string;
}

export interface ElizaVideoResponse {
  id?: string;
  video_url?: string;
  videoUrl?: string;
  url?: string;
  status?: string;
  error?: {
    message?: string;
    code?: string;
  };
}

const DEFAULT_ELIZA_VIDEO_MODEL =
  "fal-ai/minimax/hailuo-02/standard/text-to-video";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(bodyText: string): number | null {
  try {
    const parsed = JSON.parse(bodyText) as { retryAfter?: number; retry_after?: number };
    const retryAfter = Number(parsed.retryAfter ?? parsed.retry_after);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.floor(retryAfter);
    }
  } catch {
    // Ignore parse failures.
  }
  return null;
}

function resolveElizaVideoModel(model: string | undefined): string {
  const normalized = (model ?? "").trim();
  if (!normalized) return DEFAULT_ELIZA_VIDEO_MODEL;

  const legacyModelMap: Record<string, string> = {
    "minimax-video": "fal-ai/minimax/hailuo-02/standard/text-to-video",
    "minimax": "fal-ai/minimax/hailuo-02/standard/text-to-video",
    "veo3-fast": "fal-ai/veo3/fast",
    veo3: "fal-ai/veo3",
    "kling-standard": "fal-ai/kling-video/v2.1/standard/text-to-video",
    "kling-pro": "fal-ai/kling-video/v2.1/pro/text-to-video",
    "kling-master": "fal-ai/kling-video/v2.1/master/text-to-video",
  };

  return legacyModelMap[normalized] ?? normalized;
}

function isUnprocessablePayloadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Unprocessable Entity") ||
    message.includes("unprocessable") ||
    message.includes("(422)")
  );
}

function buildElizaVideoPayload(input: {
  prompt: string;
  model: string;
  duration?: number;
  resolution?: string;
  size?: string;
  aspectRatio?: string;
  includeShape: boolean;
}): Record<string, unknown> {
  return {
    prompt: input.prompt,
    model: input.model,
    ...(typeof input.duration === "number" ? { duration: input.duration } : {}),
    ...(input.includeShape && input.resolution
      ? { resolution: input.resolution }
      : {}),
    ...(input.includeShape && input.size ? { size: input.size } : {}),
    ...(input.includeShape && input.aspectRatio
      ? { aspect_ratio: input.aspectRatio }
      : {}),
  };
}

/**
 * Find video URL from response payload.
 */
function findVideoUrl(payload: unknown): string | null {
  if (typeof payload === "string" && /^https?:\/\//i.test(payload)) {
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

    // Check common video URL fields
    for (const key of ["video_url", "videoUrl", "url", "download_url"]) {
      const val = obj[key];
      if (typeof val === "string" && /^https?:\/\//i.test(val)) {
        return val;
      }
    }

    // Search nested objects
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
 * Generate video via ElizaOS.
 * Returns video URL.
 */
export async function generateElizaVideo(params: {
  prompt: string;
  model?: string;
  durationSeconds?: number;
}): Promise<{ videoUrl: string }> {
  const env = getEnv();

  const apiKey = env.ELIZA_VIDEO_API_KEY ?? env.ELIZA_API_KEY ?? null;
  const baseUrl = (
    env.ELIZA_VIDEO_BASE_URL ??
    env.ELIZA_BASE_URL ??
    "https://www.elizacloud.ai"
  ).replace(/\/+$/, "");
  const model = resolveElizaVideoModel(params.model ?? env.ELIZA_VIDEO_MODEL);
  const resolution = env.ELIZA_VIDEO_RESOLUTION;
  const size = env.ELIZA_VIDEO_SIZE;
  const aspectRatio = env.ELIZA_VIDEO_ASPECT_RATIO;

  if (!apiKey) {
    throw new Error("ELIZA_API_KEY or ELIZA_VIDEO_API_KEY is not configured.");
  }

  const minDuration = env.VIDEO_MIN_DURATION_SECONDS;
  const maxDuration = env.VIDEO_MAX_DURATION_SECONDS;
  const duration = Math.max(
    minDuration,
    Math.min(maxDuration, Math.floor(params.durationSeconds ?? 5)),
  );

  logger.info("eliza_video_starting", {
    component: "eliza_video_client",
    model,
    resolution,
    size,
    aspectRatio,
    duration,
    prompt: params.prompt.slice(0, 100),
  });

  // Respect ElizaCloud account quota globally (5 requests / 300s).
  const localGate = await enforceRateLimit({
    scope: "eliza_video_provider",
    key: "global",
    rules: [{ name: "provider_window", windowSec: 300, limit: 5 }],
  });
  if (!localGate.allowed) {
    const waitMs = Math.max(1, localGate.retryAfterSec) * 1000;
    logger.warn("eliza_video_throttled_locally", {
      component: "eliza_video_client",
      retryAfterSec: localGate.retryAfterSec,
    });
    await sleep(waitMs);
  }

  const body = buildElizaVideoPayload({
    prompt: params.prompt,
    model,
    duration,
    resolution,
    size,
    aspectRatio,
    includeShape: true,
  });

  const requestStart = async (payload: Record<string, unknown>) =>
    withRetry(
      async () => {
        const response = await fetchWithTimeout(
          `${baseUrl}/api/v1/generate-video`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          },
          120_000,
        );

        if (!response.ok) {
          const bodyText = await response.text();
          const retryAfterSec = parseRetryAfterSeconds(bodyText);
          if (response.status === 429 && retryAfterSec) {
            logger.warn("eliza_video_rate_limited_remote", {
              component: "eliza_video_client",
              retryAfterSec,
            });
            await sleep(Math.max(1, retryAfterSec) * 1000);
            throw new RetryableError(
              `ElizaOS video rate limited (429). retryAfter=${retryAfterSec}`,
            );
          }
          const msg = `ElizaOS video start failed (${response.status}): ${bodyText}`;
          if (isRetryableHttpStatus(response.status))
            throw new RetryableError(msg);
          throw new Error(msg);
        }

        return response;
      },
      { attempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    );

  let startResponse: Response;
  try {
    // Primary payload: keep explicit model/duration when supported.
    startResponse = await requestStart(body);
  } catch (error) {
    if (!isUnprocessablePayloadError(error)) {
      throw error;
    }

    logger.warn("eliza_video_retry_minimal_payload", {
      component: "eliza_video_client",
      reason: "unprocessable_payload",
    });

    // Shape fields vary between ElizaCloud-backed models; keep the requested
    // model while retrying with the smallest model-specific payload.
    try {
      startResponse = await requestStart({
        prompt: params.prompt,
        model,
        duration,
      });
    } catch (retryError) {
      if (
        !env.ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK ||
        !isUnprocessablePayloadError(retryError)
      ) {
        throw retryError;
      }

      logger.warn("eliza_video_retry_prompt_only_payload", {
        component: "eliza_video_client",
        reason: "model_payload_unprocessable",
      });
      startResponse = await requestStart({ prompt: params.prompt });
    }
  }

  const startPayload = (await startResponse.json()) as ElizaVideoResponse;

  // Check for immediate video URL (sync response)
  const immediateUrl = findVideoUrl(startPayload);
  if (immediateUrl) {
    logger.info("eliza_video_sync_result", {
      component: "eliza_video_client",
      videoUrl: immediateUrl.slice(0, 100),
    });
    return { videoUrl: immediateUrl };
  }

  // If async, we'd need to poll — but ElizaOS appears to return sync based on OpenAPI spec
  // If we got here without a URL, it might be async
  if (startPayload.id || startPayload.status) {
    // Poll for completion (async job pattern)
    const requestId = startPayload.id;
    if (!requestId) {
      throw new Error(
        "ElizaOS video generation did not return a video URL or request ID.",
      );
    }

    logger.info("eliza_video_polling", {
      component: "eliza_video_client",
      requestId,
    });

    const maxAttempts = 120; // 10 minutes at 5s intervals
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      try {
        const statusResponse = await fetchWithTimeout(
          `${baseUrl}/api/v1/generate-video/${encodeURIComponent(requestId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
          15_000,
        );

        if (!statusResponse.ok) {
          const errorBody = await statusResponse.text();
          logger.warn("eliza_video_status_error", {
            status: statusResponse.status,
            body: errorBody,
          });
          continue; // Keep polling
        }

        const pollPayload = (await statusResponse.json()) as ElizaVideoResponse;
        const videoUrl = findVideoUrl(pollPayload);

        if (videoUrl) {
          logger.info("eliza_video_complete", {
            component: "eliza_video_client",
            videoUrl: videoUrl.slice(0, 100),
            attempts: attempt + 1,
          });
          return { videoUrl };
        }

        const status = (pollPayload.status ?? "").toLowerCase();
        if (status === "failed" || status === "error") {
          throw new Error(
            `ElizaOS video generation failed: ${pollPayload.error?.message ?? "unknown error"}`,
          );
        }
      } catch (error) {
        // Transient errors — keep polling
        if (error instanceof TypeError) continue;
        throw error;
      }
    }

    throw new Error(
      `ElizaOS video rendering timed out after ${maxAttempts} polling attempts.`,
    );
  }

  throw new Error("ElizaOS video generation did not return a video URL.");
}
