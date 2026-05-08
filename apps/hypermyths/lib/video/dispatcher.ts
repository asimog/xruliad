/**
 * Video generation dispatcher.
 *
 * Primary: ElizaCloud video (configurable by env)
 * Fallbacks: OpenRouter, HuggingFace, Fal.ai, Replicate, xAI
 */

import type { VideoInferenceProviderId } from "@/lib/inference/providers";
import { renderWithxAI } from "@/lib/agents/producer";
import { generateFalVideo } from "@/lib/video/fal-video";
import { generateHuggingFaceVideo } from "@/lib/video/huggingface-video";
import { generateReplicateVideo } from "@/lib/video/replicate-video";
import { generateElizaVideo } from "@/lib/video/eliza-video";
import { generateOpenRouterVideo } from "@/lib/video/openrouter-video";
import { generatePayShVideo } from "@/lib/video/pay-sh-video";
import {
  enforceAudioStyleConstraint,
  enforceNoTextVideoConstraint,
} from "@/lib/video/prompt-guard";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";

export interface VideoGenerationParams {
  jobId: string;
  wallet: string;
  durationSeconds: number;
  prompt: string;
  imageUrl?: string;
  subjectName?: string | null;
  sourceTranscript?: string | null;
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string | null;
  provider: VideoInferenceProviderId;
}

/**
 * Generate video using the specified provider.
 */
export async function generateVideoWithProvider(
  provider: VideoInferenceProviderId,
  params: VideoGenerationParams,
): Promise<VideoGenerationResult> {
  const guardedPrompt = enforceAudioStyleConstraint(
    enforceNoTextVideoConstraint(params.prompt),
  );

  logger.info("video_dispatch_start", {
    component: "video_dispatcher",
    provider,
    jobId: params.jobId,
  });

  try {
    switch (provider) {
      case "pay_sh": {
        const result = await generatePayShVideo({
          jobId: params.jobId,
          prompt: guardedPrompt,
          imageUrl: params.imageUrl,
          durationSeconds: params.durationSeconds,
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          provider: "pay_sh",
        };
      }

      case "huggingface": {
        const result = await generateHuggingFaceVideo({
          jobId: params.jobId,
          prompt: guardedPrompt,
          durationSeconds: params.durationSeconds,
          subjectName: params.subjectName,
          sourceTranscript: params.sourceTranscript,
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          provider: "huggingface",
        };
      }

      case "fal": {
        const result = await generateFalVideo({
          prompt: guardedPrompt,
          imageUrl: params.imageUrl,
          durationSeconds: params.durationSeconds,
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: null,
          provider: "fal",
        };
      }

      case "replicate": {
        const result = await generateReplicateVideo({
          prompt: guardedPrompt,
          imageUrl: params.imageUrl,
          durationSeconds: params.durationSeconds,
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: null,
          provider: "replicate",
        };
      }

      case "eliza": {
        const result = await generateElizaVideo({
          prompt: guardedPrompt,
          durationSeconds: params.durationSeconds,
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: null,
          provider: "eliza",
        };
      }

      case "openrouter": {
        const result = await generateOpenRouterVideo({
          prompt: guardedPrompt,
          durationSeconds: params.durationSeconds,
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: null,
          provider: "openrouter",
        };
      }

      case "xai": {
        const result = await renderWithxAI(
          guardedPrompt,
          "16:9",
          params.durationSeconds,
        );
        if (!result.success || !result.videoUrl) {
          throw new Error(result.error ?? "xAI did not return a video URL.");
        }
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl ?? null,
          provider: "xai",
        };
      }

      default: {
        throw new Error(`Video provider not implemented in dispatcher: ${provider}`);
      }
    }
  } catch (error) {
    logger.error("video_dispatch_error", {
      component: "video_dispatcher",
      provider,
      jobId: params.jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate video with the active public fallback chain.
 */
export async function renderCinematicVideoWithFallback(
  params: VideoGenerationParams,
): Promise<VideoGenerationResult> {
  const env = getEnv();
  const configuredProviders: VideoInferenceProviderId[] = [];

  if (env.PAY_SH_ENABLED) {
    configuredProviders.push("pay_sh");
  }
  if (env.OPENROUTER_API_KEY) {
    configuredProviders.push("openrouter");
  }
  if (env.HUGGINGFACE_API_KEY) {
    configuredProviders.push("huggingface");
  }
  if (env.FAL_API_KEY) {
    configuredProviders.push("fal");
  }
  if (env.REPLICATE_API_KEY) {
    configuredProviders.push("replicate");
  }
  if (env.ELIZA_VIDEO_API_KEY ?? env.ELIZA_API_KEY) {
    configuredProviders.push("eliza");
  }
  if (env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY) {
    configuredProviders.push("xai");
  }

  if (configuredProviders.length === 0) {
    throw new Error(
      "No video providers are configured. Set OPENROUTER_API_KEY (primary), HUGGINGFACE_API_KEY, FAL_API_KEY, REPLICATE_API_KEY, ELIZA_VIDEO_API_KEY, or XAI_API_KEY.",
    );
  }

  const requestedPriority = (env.VIDEO_PROVIDER_PRIORITY ?? "")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean) as VideoInferenceProviderId[];

  const fallbackChain: VideoInferenceProviderId[] = [];
  for (const provider of requestedPriority) {
    if (
      (provider === "openrouter" ||
        provider === "pay_sh" ||
        provider === "huggingface" ||
        provider === "fal" ||
        provider === "replicate" ||
        provider === "eliza" ||
        provider === "xai") &&
      configuredProviders.includes(provider) &&
      !fallbackChain.includes(provider)
    ) {
      fallbackChain.push(provider);
    }
  }
  for (const provider of configuredProviders) {
    if (!fallbackChain.includes(provider)) {
      fallbackChain.push(provider);
    }
  }

  const failureMessages: string[] = [];
  for (const provider of fallbackChain) {
    logger.info("video_provider_attempt", {
      component: "video_dispatcher",
      provider,
      jobId: params.jobId,
    });

    try {
      return await generateVideoWithProvider(provider, params);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failureMessages.push(`${provider}: ${reason}`);
      logger.warn("video_provider_fallback", {
        component: "video_dispatcher",
        provider,
        jobId: params.jobId,
        error: reason,
      });
    }
  }

  throw new Error(
    `All configured video providers failed. ${failureMessages.join(" | ")}`,
  );
}
