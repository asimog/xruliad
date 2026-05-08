/**
 * Fal.ai video generation client — cheapest video endpoint.
 * 
 * API: https://fal.ai
 * Auth: Key <api_key> in header
 * Endpoint: POST /v1/{model_id}
 * 
 * Models: fal-ai/fast-svd, fal-ai/stable-video-diffusion, etc.
 * Pricing: Pay per generation, very cheap for any resolution.
 */

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";

export interface FalVideoRequest {
  prompt: string;
  image_url?: string;
  num_frames?: number;
  fps?: number;
  motion_bucket_id?: number;
  cond_aug?: number;
  seed?: number;
}

export interface FalVideoResponse {
  video?: {
    url: string;
  };
  videos?: Array<{ url: string }>;
  error?: {
    message?: string;
    type?: string;
  };
  request_id?: string;
  status?: string;
}

/**
 * Generate video via Fal.ai.
 * Supports any resolution via different models.
 */
export async function generateFalVideo(params: {
  prompt: string;
  imageUrl?: string;
  model?: string;
  durationSeconds?: number;
}): Promise<{ videoUrl: string }> {
  const env = getEnv();

  const apiKey = env.FAL_API_KEY ?? null;
  const baseUrl = (env.FAL_BASE_URL ?? "https://fal.run").replace(/\/+$/, "");
  const model =
    params.model ?? env.FAL_MODEL ?? "fal-ai/fast-svd";

  if (!apiKey) {
    throw new Error("FAL_API_KEY is not configured.");
  }

  const minDuration = env.VIDEO_MIN_DURATION_SECONDS;
  const maxDuration = env.VIDEO_MAX_DURATION_SECONDS;
  const duration = Math.max(
    minDuration,
    Math.min(maxDuration, Math.floor(params.durationSeconds ?? 4)),
  );

  // Fal uses frames, not seconds. ~24fps
  const numFrames = Math.max(14, Math.min(240, duration * 14)); // ~14 frames per second for SVD

  logger.info("fal_video_starting", {
    component: "fal_video_client",
    model,
    numFrames,
    prompt: params.prompt.slice(0, 100),
  });

  const url = `${baseUrl}/${model}`;

  const body: FalVideoRequest = {
    prompt: params.prompt,
    num_frames: numFrames,
    motion_bucket_id: 127,
    cond_aug: 0.02,
  };

  if (params.imageUrl) {
    body.image_url = params.imageUrl;
  }

  // Start generation
  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify(body),
        },
        60_000, // Fal can take longer
      );

      if (!res.ok) {
        const errorBody = await res.text();
        const msg = `Fal.ai video generation failed (${res.status}): ${errorBody}`;
        if (isRetryableHttpStatus(res.status))
          throw new RetryableError(msg);
        throw new Error(msg);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 2000, maxDelayMs: 10000 },
  );

  const data = (await response.json()) as FalVideoResponse;

  if (data.error) {
    throw new Error(
      `Fal.ai API error: ${data.error.message ?? "unknown error"}`,
    );
  }

  // Extract video URL
  if (data.video?.url) {
    logger.info("fal_video_complete", {
      component: "fal_video_client",
      videoUrl: data.video.url.slice(0, 100),
    });
    return { videoUrl: data.video.url };
  }

  if (data.videos?.[0]?.url) {
    return { videoUrl: data.videos[0].url };
  }

  throw new Error("Fal.ai did not return a video URL.");
}
