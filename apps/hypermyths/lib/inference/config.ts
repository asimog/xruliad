// Inference runtime config — Multi-provider support
// Text: ElizaOS (primary), HuggingFace, G0DM0D3, OpenRouter (fallback)
// Video: Fal.ai (cheapest), ElizaOS, Replicate, xAI, Vast.ai

import { getEnv } from "@/lib/env";
import type {
  TextInferenceProviderId,
  VideoInferenceProviderId,
} from "@/lib/inference/providers";

export interface ProviderRuntimeSelection {
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

export interface InferenceRuntimeConfig {
  text: {
    provider: TextInferenceProviderId;
    model: string | null;
  };
  video: {
    provider: VideoInferenceProviderId;
    model: string | null;
  };
  providers: {
    text: Record<TextInferenceProviderId, ProviderRuntimeSelection>;
    video: Record<VideoInferenceProviderId, ProviderRuntimeSelection>;
  };
  updatedBy: string | null;
  updatedAt: string | null;
}

export function getElizaTextConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.ELIZA_API_KEY ?? env.ELIZA_VIDEO_API_KEY ?? null,
    baseUrl: env.ELIZA_BASE_URL ?? null,
    model: env.ELIZA_MODEL ?? "gpt-4o-mini",
  };
}

export function getHuggingFaceConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.HUGGINGFACE_API_KEY ?? null,
    baseUrl: env.HUGGINGFACE_BASE_URL ?? null,
    model: env.HUGGINGFACE_MODEL ?? "mistralai/Mistral-7B-Instruct-v0.3",
  };
}

export function getTextProviderConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.GODMODE_API_KEY ?? null,
    baseUrl: env.GODMODE_API_BASE_URL ?? null,
    model: env.GODMODE_MODEL ?? "ultraplinian/fast",
  };
}

export function getVideoProviderConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY ?? null,
    baseUrl: env.XAI_VIDEO_BASE_URL ?? env.XAI_BASE_URL,
    model: env.XAI_VIDEO_MODEL ?? "grok-imagine-video",
  };
}

export function getElizaVideoConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.ELIZA_VIDEO_API_KEY ?? env.ELIZA_API_KEY ?? null,
    baseUrl: env.ELIZA_VIDEO_BASE_URL ?? env.ELIZA_BASE_URL ?? null,
    model:
      env.ELIZA_VIDEO_MODEL ??
      "fal-ai/minimax/hailuo-02/standard/text-to-video",
  };
}

export function getFalConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.FAL_API_KEY ?? null,
    baseUrl: env.FAL_BASE_URL ?? null,
    model: env.FAL_MODEL ?? "fal-ai/fast-svd",
  };
}

export function getReplicateConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.REPLICATE_API_KEY ?? null,
    baseUrl: "https://api.replicate.com/v1",
    model: env.REPLICATE_MODEL ?? "stability-ai/stable-video-diffusion",
  };
}

export function getVastConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.VAST_API_KEY ?? null,
    baseUrl: env.VAST_BASE_URL ?? null,
    model: env.VAST_MODEL ?? "stability-video-diffusion",
  };
}

export function getOpenRouterVideoConfig(): ProviderRuntimeSelection {
  const env = getEnv();
  return {
    apiKey: env.OPENROUTER_API_KEY ?? null,
    baseUrl: env.OPENROUTER_BASE_URL ?? null,
    model: env.OPENROUTER_VIDEO_MODEL ?? "alibaba/wan-2.6",
  };
}

export async function getInferenceRuntimeConfig(): Promise<InferenceRuntimeConfig> {
  const env = getEnv();

  // Text providers
  const textProviders: Record<
    TextInferenceProviderId,
    ProviderRuntimeSelection
  > = {
    eliza: getElizaTextConfig(),
    huggingface: getHuggingFaceConfig(),
    godmode: getTextProviderConfig(),
    openrouter: {
      apiKey: env.OPENROUTER_API_KEY ?? null,
      baseUrl: env.OPENROUTER_BASE_URL ?? null,
      model: env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    },
  };

  // Video providers
  const videoProviders: Record<
    VideoInferenceProviderId,
    ProviderRuntimeSelection
  > = {
    pay_sh: {
      apiKey: null,
      baseUrl: null,
      model: "solana-foundation/alibaba/videoenhan/generate-video",
    },
    huggingface: {
      apiKey: env.HUGGINGFACE_API_KEY ?? null,
      baseUrl: null,
      model: env.HF_VIDEO_MODEL ?? "Wan-AI/Wan2.1-T2V-14B",
    },
    fal: getFalConfig(),
    eliza: getElizaVideoConfig(),
    replicate: getReplicateConfig(),
    xai: getVideoProviderConfig(),
    vast: getVastConfig(),
    openrouter: getOpenRouterVideoConfig(),
  };

  return {
    text: {
      provider: "eliza", // ElizaOS is now primary
      model: textProviders.eliza.model,
    },
    video: {
      provider: "eliza",
      model: videoProviders.eliza.model,
    },
    providers: {
      text: textProviders,
      video: videoProviders,
    },
    updatedBy: "env",
    updatedAt: null,
  };
}
