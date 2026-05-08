// Inference provider registry — modular multi-provider support
// Supports: G0DM0D3, OpenRouter, ElizaOS, HuggingFace (text)
//           xAI, ElizaOS, Fal.ai, Replicate, Vast.ai (video)

export type TextInferenceProviderId =
  | "godmode"
  | "openrouter"
  | "eliza"
  | "huggingface";

export type VideoInferenceProviderId =
  | "pay_sh"
  | "huggingface"
  | "xai"
  | "eliza"
  | "fal"
  | "replicate"
  | "vast"
  | "openrouter";

export type InferenceProviderFieldId =
  | "apiKey"
  | "baseUrl"
  | "model"
  | "priority";

export interface ProviderFieldOption {
  label: string;
  helper: string;
  placeholder: string;
  type: "text" | "password" | "url" | "number";
}

export interface ProviderOption<TId extends string = string> {
  id: TId;
  label: string;
  description: string;
  implemented: boolean;
  defaultModel: string | null;
  fields: InferenceProviderFieldId[];
  costTier?: "free" | "cheap" | "moderate" | "expensive";
}

export const PROVIDER_FIELD_OPTIONS: Record<
  InferenceProviderFieldId,
  ProviderFieldOption
> = {
  apiKey: {
    label: "API key",
    helper: "Stored for this provider surface; leave blank to disable.",
    placeholder: "sk-...",
    type: "password",
  },
  baseUrl: {
    label: "Base URL",
    helper: "Override provider endpoint (optional).",
    placeholder: "https://api.provider.com/v1",
    type: "url",
  },
  model: {
    label: "Model",
    helper: "Default model ID used by this provider.",
    placeholder: "model-id",
    type: "text",
  },
  priority: {
    label: "Priority",
    helper: "Lower number = higher priority in fallback chain.",
    placeholder: "1",
    type: "number",
  },
};

// Cheapest-first ordering for fallback chain
export const TEXT_PROVIDER_OPTIONS: ProviderOption<TextInferenceProviderId>[] =
  [
    {
      id: "eliza",
      label: "ElizaOS",
      description:
        "ElizaCloud API — unified text/image/video with multi-model support. Cheapest primary.",
      implemented: true,
      defaultModel: "gpt-4o-mini",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "cheap",
    },
    {
      id: "huggingface",
      label: "HuggingFace",
      description:
        "HuggingFace Inference API — free tier available with many open models.",
      implemented: true,
      defaultModel: "mistralai/Mistral-7B-Instruct-v0.3",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "free",
    },
    {
      id: "godmode",
      label: "G0DM0D3",
      description: "Railway-hosted orchestration brain backed by OpenRouter.",
      implemented: true,
      defaultModel: "ultraplinian/fast",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "moderate",
    },
    {
      id: "openrouter",
      label: "Direct OpenRouter",
      description: "Emergency text fallback that bypasses G0DM0D3.",
      implemented: true,
      defaultModel: "openai/gpt-4o-mini",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "moderate",
    },
  ];

// Video provider registry
export const VIDEO_PROVIDER_OPTIONS: ProviderOption<VideoInferenceProviderId>[] =
  [
    {
      id: "pay_sh",
      label: "Pay.sh",
      description:
        "Pay.sh gateway-backed video generation and analysis, paid through the intermediary checkout.",
      implemented: true,
      defaultModel: "solana-foundation/alibaba/videoenhan/generate-video",
      fields: ["priority"],
      costTier: "cheap",
    },
    {
      id: "huggingface",
      label: "HuggingFace (Wan2.1-T2V-14B)",
      description:
        "HuggingFace Inference Providers — Wan2.1-T2V-14B via fal-ai. Pay with HF token.",
      implemented: true,
      defaultModel: "Wan-AI/Wan2.1-T2V-14B",
      fields: ["apiKey", "model", "priority"],
      costTier: "cheap",
    },
    {
      id: "fal",
      label: "Fal.ai",
      description:
        "Fal.ai video generation — cheapest available video endpoint. Any resolution.",
      implemented: true,
      defaultModel: "fal-ai/fast-svd",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "cheap",
    },
    {
      id: "eliza",
      label: "ElizaOS Video",
      description:
        "ElizaCloud video generation API. Multi-model support (MiniMax, Runway).",
      implemented: true,
      defaultModel: "fal-ai/minimax/hailuo-02/standard/text-to-video",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "cheap",
    },
    {
      id: "replicate",
      label: "Replicate",
      description:
        "Replicate video models — stable diffusion video, modelscope, etc.",
      implemented: true,
      defaultModel: "stability-ai/stable-video-diffusion",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "moderate",
    },
    {
      id: "xai",
      label: "xAI Video",
      description: "xAI grok-imagine-video — high quality but expensive.",
      implemented: true,
      defaultModel: "grok-imagine-video",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "expensive",
    },
    {
      id: "vast",
      label: "Vast.ai",
      description:
        "Vast.ai GPU rental — run any open video model on cheap cloud GPUs.",
      implemented: true,
      defaultModel: "stability-video-diffusion",
      fields: ["apiKey", "baseUrl", "model", "priority"],
      costTier: "cheap",
    },
    {
      id: "openrouter",
      label: "OpenRouter Video",
      description:
        "OpenRouter video models — Seedance 1.5 Pro ($2.40/M tokens, ~$0.09/clip at 480p/4s), Wan 2.6 ($0.08/s).",
      implemented: true,
      defaultModel: "alibaba/wan-2.6",
      fields: ["apiKey", "model", "priority"],
      costTier: "cheap",
    },
  ];

export function isTextInferenceProvider(
  id: string,
): id is TextInferenceProviderId {
  return (
    id === "godmode" ||
    id === "openrouter" ||
    id === "eliza" ||
    id === "huggingface"
  );
}

export function isVideoInferenceProvider(
  id: string,
): id is VideoInferenceProviderId {
  return (
    id === "huggingface" ||
    id === "pay_sh" ||
    id === "xai" ||
    id === "eliza" ||
    id === "fal" ||
    id === "replicate" ||
    id === "vast" ||
    id === "openrouter"
  );
}

/**
 * Get sorted text providers by priority (cheapest first).
 */
export function getTextProvidersByPriority(): TextInferenceProviderId[] {
  return [...TEXT_PROVIDER_OPTIONS]
    .sort((a, b) => {
      const priorityA = getProviderPriority(a.id);
      const priorityB = getProviderPriority(b.id);
      return priorityA - priorityB;
    })
    .map((p) => p.id);
}

/**
 * Get sorted video providers by priority (cheapest first).
 */
export function getVideoProvidersByPriority(): VideoInferenceProviderId[] {
  return [...VIDEO_PROVIDER_OPTIONS]
    .sort((a, b) => {
      const priorityA = getProviderPriority(a.id);
      const priorityB = getProviderPriority(b.id);
      return priorityA - priorityB;
    })
    .map((p) => p.id);
}

function getProviderPriority(id: string): number {
  const priorities: Record<string, number> = {
    eliza: 1,
    pay_sh: 0,
    huggingface: 3,
    godmode: 4,
    openrouter: 2,
    fal: 3,
    replicate: 4,
    vast: 5,
    xai: 6,
  };
  return priorities[id] ?? 99;
}
