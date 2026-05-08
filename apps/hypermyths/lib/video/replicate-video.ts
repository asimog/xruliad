/**
 * Replicate video generation client.
 * 
 * API: https://replicate.com
 * Auth: Bearer <api_token>
 * Endpoint: POST /v1/predictions
 * 
 * Models: stability-ai/stable-video-diffusion, modelscope/text-to-video, etc.
 * Pay-per-second compute pricing.
 */

import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";

export interface ReplicatePrediction {
  id?: string;
  version?: string;
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
  created_at?: string;
  completed_at?: string;
  urls?: {
    get?: string;
    cancel?: string;
  };
  input?: Record<string, unknown>;
}

/**
 * Start a Replicate prediction.
 */
async function startPrediction(
  version: string,
  input: Record<string, unknown>,
  apiKey: string,
): Promise<ReplicatePrediction> {
  const response = await fetchWithTimeout(
    "https://api.replicate.com/v1/predictions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ version, input }),
    },
    30_000,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Replicate prediction start failed (${response.status}): ${errorBody}`,
    );
  }

  return (await response.json()) as ReplicatePrediction;
}

/**
 * Get prediction status.
 */
async function getPrediction(
  predictionId: string,
  apiKey: string,
): Promise<ReplicatePrediction> {
  const response = await fetchWithTimeout(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
    15_000,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Replicate status check failed (${response.status}): ${errorBody}`,
    );
  }

  return (await response.json()) as ReplicatePrediction;
}

/**
 * Replicate model versions for video.
 */
const REPLICATE_MODELS: Record<string, string> = {
  "stability-ai/stable-video-diffusion":
    "3f0457e4619da79c1f5f8b5a1e8b9e4c7a8b2f1d3e5c6a7b9d0e1f2a3b4c5d6e",
  "modelscope/text-to-video":
    "a8a2f1e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
};

/**
 * Generate video via Replicate.
 */
export async function generateReplicateVideo(params: {
  prompt: string;
  imageUrl?: string;
  model?: string;
  durationSeconds?: number;
}): Promise<{ videoUrl: string }> {
  const env = getEnv();

  const apiKey = env.REPLICATE_API_KEY ?? null;
  const modelName =
    params.model ?? env.REPLICATE_MODEL ?? "stability-ai/stable-video-diffusion";
  const version = REPLICATE_MODELS[modelName] ?? modelName;

  if (!apiKey) {
    throw new Error("REPLICATE_API_KEY is not configured.");
  }

  const minDuration = env.VIDEO_MIN_DURATION_SECONDS;
  const maxDuration = env.VIDEO_MAX_DURATION_SECONDS;
  const duration = Math.max(
    minDuration,
    Math.min(maxDuration, Math.floor(params.durationSeconds ?? 4)),
  );

  logger.info("replicate_video_starting", {
    component: "replicate_video_client",
    model: modelName,
    duration,
    prompt: params.prompt.slice(0, 100),
  });

  // Build input based on model
  const input: Record<string, unknown> = {
    prompt: params.prompt,
  };

  if (modelName.includes("stable-video-diffusion")) {
    input.num_frames = Math.max(14, Math.min(100, duration * 14));
    input.motion_bucket_id = 127;
    input.cond_aug = 0.02;
    if (params.imageUrl) {
      input.image = params.imageUrl;
    }
  } else if (modelName.includes("modelscope")) {
    input.num_steps = 50;
    input.fps = Math.max(8, Math.min(30, 24));
  }

  // Start prediction
  const prediction = await withRetry(
    async () => {
      try {
        return await startPrediction(version, input, apiKey);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        if (isRetryableHttpStatus(500)) throw new RetryableError(msg);
        throw error;
      }
    },
    { attempts: 2, baseDelayMs: 1000, maxDelayMs: 5000 },
  );

  if (!prediction.id) {
    throw new Error("Replicate did not return a prediction ID.");
  }

  logger.info("replicate_video_polling", {
    component: "replicate_video_client",
    predictionId: prediction.id,
  });

  // Poll for completion
  const maxAttempts = 180; // 15 minutes at 5s intervals
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    try {
      const status = await getPrediction(prediction.id!, apiKey);

      if (status.status === "succeeded") {
        // Extract video URL
        let videoUrl: string | null = null;

        if (typeof status.output === "string") {
          videoUrl = status.output;
        } else if (Array.isArray(status.output) && status.output[0]) {
          videoUrl = status.output[0];
        }

        if (videoUrl) {
          logger.info("replicate_video_complete", {
            component: "replicate_video_client",
            videoUrl: videoUrl.slice(0, 100),
            attempts: attempt + 1,
          });
          return { videoUrl };
        }

        throw new Error(
          "Replicate prediction succeeded but no video URL found.",
        );
      }

      if (
        status.status === "failed" ||
        status.status === "canceled"
      ) {
        throw new Error(
          `Replicate video generation failed: ${status.error ?? "unknown error"}`,
        );
      }

      // Still processing
      if (attempt > 0 && attempt % 12 === 0) {
        logger.info("replicate_video_still_processing", {
          component: "replicate_video_client",
          attempt: attempt + 1,
          status: status.status,
        });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("failed")
      ) {
        throw error;
      }
      // Transient errors — keep polling
      continue;
    }
  }

  throw new Error(
    `Replicate video rendering timed out after ${maxAttempts} polling attempts.`,
  );
}
