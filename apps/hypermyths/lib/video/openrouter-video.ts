/**
 * OpenRouter video generation client.
 *
 * API: https://openrouter.ai/api/v1
 * Auth: Bearer <api_key>
 * Endpoint: POST /videos
 * Poll:     GET  {polling_url} (returned in submission response)
 *
 * Supported models:
 *   bytedance/seedance-1-5-pro — $2.40/M tokens → ~$0.09 per 4s/480p clip (default)
 *   alibaba/wan-2.6            — $0.08/sec via AtlasCloud (~$0.40 per 5s clip)
 *   bytedance/seedance-2.0     — $7/M tokens
 */

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";

// Fixed seed for style consistency across all generations (first 32 bits of project fingerprint).
const VIDEO_SEED = 0xe676098e >>> 0; // 3866502542

interface OpenRouterVideoSubmitResponse {
  id?: string;
  polling_url?: string;
  error?: string;
}

interface OpenRouterVideoPollResponse {
  status?: "pending" | "processing" | "completed" | "failed";
  unsigned_urls?: string[];
  error?: string;
}

type OpenRouterVideoRequestShape = {
  duration: number;
  resolution?: string;
  aspectRatio?: string;
  size?: string;
  seed?: number;
};

function normalizeOpenRouterVideoRequest(params: {
  model: string;
  duration: number;
  resolution: string;
  aspectRatio?: string;
}): OpenRouterVideoRequestShape {
  const model = params.model.trim().toLowerCase();

  if (model === "kwaivgi/kling-video-o1") {
    const duration = params.duration >= 8 ? 10 : 5;
    const aspectRatio =
      params.aspectRatio === "9:16" || params.aspectRatio === "1:1"
        ? params.aspectRatio
        : "16:9";
    const size =
      aspectRatio === "9:16"
        ? "720x1280"
        : aspectRatio === "1:1"
          ? "720x720"
          : "1280x720";

    return {
      duration,
      resolution: "720p",
      aspectRatio,
      size,
    };
  }

  return {
    duration: params.duration,
    resolution: params.resolution,
    aspectRatio: params.aspectRatio,
    seed: VIDEO_SEED,
  };
}

async function submitVideoGeneration(params: {
  baseUrl: string;
  model: string;
  prompt: string;
  duration: number;
  resolution: string;
  aspectRatio?: string;
  apiKey: string;
  siteUrl?: string;
  appName?: string;
}): Promise<OpenRouterVideoSubmitResponse> {
  const requestShape = normalizeOpenRouterVideoRequest({
    model: params.model,
    duration: params.duration,
    resolution: params.resolution,
    aspectRatio: params.aspectRatio,
  });

  return withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${params.baseUrl.replace(/\/+$/, "")}/videos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.apiKey}`,
            ...(params.siteUrl ? { "HTTP-Referer": params.siteUrl } : {}),
            "X-Title": params.appName ?? "HyperMyths",
          },
          body: JSON.stringify({
            model: params.model,
            prompt: params.prompt,
            duration: requestShape.duration,
            ...(requestShape.resolution
              ? { resolution: requestShape.resolution }
              : {}),
            ...(requestShape.aspectRatio
              ? { aspect_ratio: requestShape.aspectRatio }
              : {}),
            ...(requestShape.size ? { size: requestShape.size } : {}),
            ...(typeof requestShape.seed === "number"
              ? { seed: requestShape.seed }
              : {}),
          }),
        },
        30_000,
      );

      if (!res.ok) {
        const body = await res.text();
        const msg = `OpenRouter video submit failed (${res.status}): ${body}`;
        if (isRetryableHttpStatus(res.status)) throw new RetryableError(msg);
        throw new Error(msg);
      }

      return (await res.json()) as OpenRouterVideoSubmitResponse;
    },
    { attempts: 2, baseDelayMs: 1000, maxDelayMs: 5000 },
  );
}

async function pollVideoStatus(
  pollingUrl: string,
  apiKey: string,
): Promise<OpenRouterVideoPollResponse> {
  const res = await fetchWithTimeout(
    pollingUrl,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    15_000,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter video poll failed (${res.status}): ${body}`);
  }

  return (await res.json()) as OpenRouterVideoPollResponse;
}

export async function generateOpenRouterVideo(params: {
  prompt: string;
  model?: string;
  durationSeconds?: number;
  resolution?: string;
}): Promise<{ videoUrl: string }> {
  const env = getEnv();
  const apiKey = env.OPENROUTER_API_KEY;
  const baseUrl = env.OPENROUTER_BASE_URL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }
  if (!baseUrl) {
    throw new Error("OPENROUTER_BASE_URL is not configured.");
  }

  const model = params.model ?? env.OPENROUTER_VIDEO_MODEL;
  const minDuration = env.VIDEO_MIN_DURATION_SECONDS;
  const maxDuration = env.VIDEO_MAX_DURATION_SECONDS;
  const duration = Math.max(minDuration, Math.min(maxDuration, Math.floor(params.durationSeconds ?? 4)));
  const resolution = params.resolution ?? env.OPENROUTER_VIDEO_RESOLUTION ?? env.VIDEO_RESOLUTION;
  const aspectRatio = env.OPENROUTER_VIDEO_ASPECT_RATIO;

  logger.info("openrouter_video_starting", {
    component: "openrouter_video_client",
    model,
    baseUrl,
    duration,
    resolution,
    aspectRatio,
    apiKeySuffix: apiKey.slice(-8),
    seed: VIDEO_SEED,
    prompt: params.prompt.slice(0, 100),
  });

  const submission = await submitVideoGeneration({
    baseUrl,
    model,
    prompt: params.prompt,
    duration,
    resolution,
    aspectRatio,
    apiKey,
    siteUrl: env.OPENROUTER_SITE_URL,
    appName: env.OPENROUTER_APP_NAME,
  });

  if (!submission.id || !submission.polling_url) {
    throw new Error(
      `OpenRouter video submit did not return a job ID or polling URL. Error: ${submission.error ?? "unknown"}`,
    );
  }

  logger.info("openrouter_video_polling", {
    component: "openrouter_video_client",
    jobId: submission.id,
    pollingUrl: submission.polling_url,
  });

  const pollIntervalMs = env.VIDEO_RENDER_POLL_INTERVAL_MS;
  const maxAttempts = env.VIDEO_RENDER_MAX_POLL_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    let statusData: OpenRouterVideoPollResponse;
    try {
      statusData = await pollVideoStatus(submission.polling_url, apiKey);
    } catch {
      continue;
    }

    if (statusData.status === "completed") {
      const videoUrl = statusData.unsigned_urls?.[0];
      if (videoUrl) {
        logger.info("openrouter_video_complete", {
          component: "openrouter_video_client",
          jobId: submission.id,
          videoUrl: videoUrl.slice(0, 100),
          attempts: attempt + 1,
        });
        return { videoUrl };
      }
      throw new Error("OpenRouter video completed but no URL in unsigned_urls.");
    }

    if (statusData.status === "failed") {
      throw new Error(
        `OpenRouter video generation failed: ${statusData.error ?? "unknown error"}`,
      );
    }

    if (attempt > 0 && attempt % 12 === 0) {
      logger.info("openrouter_video_still_processing", {
        component: "openrouter_video_client",
        jobId: submission.id,
        attempt: attempt + 1,
        status: statusData.status,
      });
    }
  }

  throw new Error(
    `OpenRouter video timed out after ${maxAttempts} polling attempts (job: ${submission.id}).`,
  );
}
