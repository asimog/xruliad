/**
 * Video provider dispatcher for video-service.
 * Routes video generation to the configured provider.
 * Supports: xAI, ElizaOS, Fal.ai, Replicate
 */

import { setTimeout as sleep } from "timers/promises";
import { getVideoServiceEnv } from "../env";

export type VideoProviderId = "xai" | "eliza" | "fal" | "replicate";

export interface GenerateClipInput {
  provider: VideoProviderId;
  model: string;
  resolution: "480p" | "720p";
  aspectRatio?: "1:1" | "16:9" | "9:16";
  prompt: string;
  durationSeconds: number;
  imageUrl?: string | null;
  onProgress?: () => Promise<void> | void;
}

export interface ClipResult {
  operationName: string;
  videoUris: string[];
  videoBytesBase64: string[];
  provider: VideoProviderId;
}

const DEFAULT_FALLBACK_ORDER: VideoProviderId[] = [
  "eliza",
  "xai",
  "fal",
  "replicate",
];

const DEFAULT_ELIZA_VIDEO_MODEL =
  "fal-ai/minimax/hailuo-02/standard/text-to-video";

function resolveElizaVideoModel(model: string | undefined): string {
  const normalized = (model ?? "").trim();
  if (!normalized) return DEFAULT_ELIZA_VIDEO_MODEL;

  const legacyModelMap: Record<string, string> = {
    "minimax-video": "fal-ai/minimax/hailuo-02/standard/text-to-video",
    minimax: "fal-ai/minimax/hailuo-02/standard/text-to-video",
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

function buildElizaPayload(input: {
  prompt: string;
  model: string;
  duration: number;
  resolution?: string;
  size?: string;
  aspectRatio?: string;
  includeShape: boolean;
}): Record<string, unknown> {
  return {
    prompt: input.prompt,
    model: input.model,
    duration: input.duration,
    ...(input.includeShape && input.resolution
      ? { resolution: input.resolution }
      : {}),
    ...(input.includeShape && input.size ? { size: input.size } : {}),
    ...(input.includeShape && input.aspectRatio
      ? { aspect_ratio: input.aspectRatio }
      : {}),
  };
}

function hasProviderCredentials(provider: VideoProviderId): boolean {
  const env = getVideoServiceEnv();
  switch (provider) {
    case "eliza":
      return Boolean(env.ELIZA_VIDEO_API_KEY ?? env.ELIZA_API_KEY);
    case "xai":
      return Boolean(env.XAI_API_KEY);
    case "fal":
      return Boolean(env.FAL_API_KEY);
    case "replicate":
      return Boolean(env.REPLICATE_API_KEY);
    default:
      return false;
  }
}

function resolveFallbackProviders(): VideoProviderId[] {
  const env = getVideoServiceEnv();
  const requested = env.VIDEO_PROVIDER_PRIORITY
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is VideoProviderId =>
      ["eliza", "xai", "fal", "replicate"].includes(value),
    );
  const ordered =
    requested && requested.length > 0 ? requested : DEFAULT_FALLBACK_ORDER;
  const configured = ordered.filter((provider) => hasProviderCredentials(provider));
  return configured.length > 0 ? configured : ordered;
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

    for (const key of ["video_url", "videoUrl", "url", "download_url"]) {
      const val = obj[key];
      if (typeof val === "string" && /^https?:\/\//i.test(val)) {
        return val;
      }
    }

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
 * Extract video URLs from response.
 */
function extractVideoUrls(payload: unknown): string[] {
  const urls = new Set<string>();
  
  function collect(value: unknown): void {
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value) && /(mp4|mov|webm)(\?|$)/i.test(value)) {
        urls.add(value);
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) collect(item);
      return;
    }

    if (!value || typeof value !== "object") return;

    for (const [, item] of Object.entries(value as Record<string, unknown>)) {
      collect(item);
    }
  }

  collect(payload);
  return [...urls];
}

/**
 * xAI video provider.
 */
async function generateXAiClip(input: GenerateClipInput): Promise<ClipResult> {
  const env = getVideoServiceEnv();
  const apiKey = env.XAI_API_KEY;
  const baseUrl = env.XAI_BASE_URL.replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("xAI: XAI_API_KEY is required");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const startResponse = await fetch(`${baseUrl}/videos/generations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: input.model || env.XAI_VIDEO_MODEL,
      prompt: input.prompt,
      image_url: input.imageUrl || undefined,
      duration_seconds: Math.max(1, Math.min(15, Math.floor(input.durationSeconds))),
      size: "1280x720",
    }),
  });

  if (!startResponse.ok) {
    const body = await startResponse.text();
    throw new Error(`xAI video start failed (${startResponse.status}): ${body}`);
  }

  const started = (await startResponse.json()) as Record<string, unknown>;
  const immediateUrls = extractVideoUrls(started);
  if (immediateUrls.length) {
    return {
      operationName: (started.request_id as string) ?? "xai-immediate",
      videoUris: immediateUrls,
      videoBytesBase64: [],
      provider: "xai",
    };
  }

  const requestId = (started.request_id ?? started.id) as string | null;
  if (!requestId) {
    throw new Error("xAI video generation did not return a request id");
  }

  for (let attempt = 0; attempt < env.VIDEO_MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(env.VIDEO_POLL_INTERVAL_MS);
    await input.onProgress?.();

    const statusResponse = await fetch(
      `${baseUrl}/videos/${encodeURIComponent(requestId)}`,
      { method: "GET", headers },
    );

    if (!statusResponse.ok) {
      const body = await statusResponse.text();
      throw new Error(`xAI polling failed (${statusResponse.status}): ${body}`);
    }

    const statusPayload = (await statusResponse.json()) as Record<string, unknown>;
    const status = ((statusPayload.status ?? statusPayload.state ?? "") as string).trim().toLowerCase();

    if (status === "failed" || status === "error" || status === "cancelled" || status === "expired") {
      throw new Error(`xAI video generation failed: ${(statusPayload.error as string) ?? "unknown error"}`);
    }

    const videoUris = extractVideoUrls(statusPayload);
    if (status === "done" || status === "completed" || status === "complete" || status === "ready" || status === "succeeded" || videoUris.length) {
      if (!videoUris.length) {
        throw new Error("xAI video generation completed without a video URL");
      }
      return { operationName: requestId, videoUris, videoBytesBase64: [], provider: "xai" };
    }
  }

  throw new Error("Timed out while waiting for xAI video generation");
}

/**
 * ElizaOS video provider.
 */
async function generateElizaClip(input: GenerateClipInput): Promise<ClipResult> {
  const env = getVideoServiceEnv();
  const apiKey = env.ELIZA_VIDEO_API_KEY ?? env.ELIZA_API_KEY;
  const baseUrl = (env.ELIZA_VIDEO_BASE_URL ?? env.ELIZA_BASE_URL ?? "https://www.elizacloud.ai").replace(/\/+$/, "");
  const model = resolveElizaVideoModel(input.model || env.ELIZA_VIDEO_MODEL);

  if (!apiKey) {
    throw new Error("ElizaOS: ELIZA_VIDEO_API_KEY or ELIZA_API_KEY is required");
  }

  const duration = Math.max(3, Math.min(60, Math.floor(input.durationSeconds)));

  const requestStart = async (payload: Record<string, unknown>) => {
    const response = await fetch(`${baseUrl}/api/v1/generate-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ElizaOS video start failed (${response.status}): ${body}`);
    }

    return response;
  };

  let response: Response;
  try {
    response = await requestStart(
      buildElizaPayload({
        prompt: input.prompt,
        model,
        duration,
        resolution: env.ELIZA_VIDEO_RESOLUTION,
        size: env.ELIZA_VIDEO_SIZE,
        aspectRatio: env.ELIZA_VIDEO_ASPECT_RATIO,
        includeShape: true,
      }),
    );
  } catch (error) {
    if (!isUnprocessablePayloadError(error)) throw error;

    try {
      response = await requestStart({ prompt: input.prompt, model, duration });
    } catch (retryError) {
      if (
        !env.ELIZA_VIDEO_ALLOW_PROMPT_ONLY_FALLBACK ||
        !isUnprocessablePayloadError(retryError)
      ) {
        throw retryError;
      }
      response = await requestStart({ prompt: input.prompt });
    }
  }

  const data = (await response.json()) as Record<string, unknown>;
  const videoUrl = findVideoUrl(data);

  if (videoUrl) {
    return {
      operationName: (data.id as string) ?? "eliza-sync",
      videoUris: [videoUrl],
      videoBytesBase64: [],
      provider: "eliza",
    };
  }

  // Async job - poll for completion
  const requestId = data.id as string | null;
  if (!requestId) {
    throw new Error("ElizaOS video generation did not return a video URL or request ID");
  }

  for (let attempt = 0; attempt < env.VIDEO_MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(env.VIDEO_POLL_INTERVAL_MS);
    await input.onProgress?.();

    const statusResponse = await fetch(
      `${baseUrl}/api/v1/generate-video/${encodeURIComponent(requestId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!statusResponse.ok) continue; // Keep polling

    const pollPayload = (await statusResponse.json()) as Record<string, unknown>;
    const url = findVideoUrl(pollPayload);

    if (url) {
      return {
        operationName: requestId,
        videoUris: [url],
        videoBytesBase64: [],
        provider: "eliza",
      };
    }

    const status = ((pollPayload.status ?? "") as string).toLowerCase();
    if (status === "failed" || status === "error") {
      throw new Error(`ElizaOS video generation failed`);
    }
  }

  throw new Error("Timed out while waiting for ElizaOS video generation");
}

/**
 * Fal.ai video provider.
 */
async function generateFalClip(input: GenerateClipInput): Promise<ClipResult> {
  const env = getVideoServiceEnv();
  const apiKey = env.FAL_API_KEY;
  const baseUrl = (env.FAL_BASE_URL ?? "https://fal.run").replace(/\/+$/, "");
  const model = input.model || env.FAL_MODEL || "fal-ai/fast-svd";

  if (!apiKey) {
    throw new Error("Fal.ai: FAL_API_KEY is required");
  }

  const duration = Math.max(2, Math.min(10, Math.floor(input.durationSeconds)));
  const numFrames = Math.max(14, Math.min(240, duration * 14));

  const url = `${baseUrl}/${model}`;
  const body = {
    prompt: input.prompt,
    num_frames: numFrames,
    motion_bucket_id: 127,
    cond_aug: 0.02,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fal.ai video generation failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    throw new Error(`Fal.ai API error: ${(data.error as Record<string, unknown>)?.message ?? "unknown error"}`);
  }

  let videoUrl: string | null = null;

  if (data.video && typeof data.video === "object") {
    videoUrl = (data.video as Record<string, unknown>).url as string | null;
  }

  if (!videoUrl && Array.isArray(data.videos) && data.videos[0]) {
    videoUrl = (data.videos[0] as Record<string, unknown>).url as string | null;
  }

  if (!videoUrl) {
    videoUrl = findVideoUrl(data);
  }

  if (videoUrl) {
    return {
      operationName: "fal-sync",
      videoUris: [videoUrl],
      videoBytesBase64: [],
      provider: "fal",
    };
  }

  throw new Error("Fal.ai did not return a video URL");
}

/**
 * Replicate video provider.
 */
async function generateReplicateClip(input: GenerateClipInput): Promise<ClipResult> {
  const env = getVideoServiceEnv();
  const apiKey = env.REPLICATE_API_KEY;
  const modelName = input.model || env.REPLICATE_MODEL || "stability-ai/stable-video-diffusion";

  if (!apiKey) {
    throw new Error("Replicate: REPLICATE_API_KEY is required");
  }

  const duration = Math.max(2, Math.min(15, Math.floor(input.durationSeconds)));

  // Start prediction
  const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      version: modelName,
      input: {
        prompt: input.prompt,
        num_frames: Math.max(14, Math.min(100, duration * 14)),
        motion_bucket_id: 127,
        cond_aug: 0.02,
      },
    }),
  });

  if (!startResponse.ok) {
    const body = await startResponse.text();
    throw new Error(`Replicate prediction start failed (${startResponse.status}): ${body}`);
  }

  const prediction = (await startResponse.json()) as Record<string, unknown>;
  const predictionId = prediction.id as string | null;

  if (!predictionId) {
    throw new Error("Replicate did not return a prediction ID");
  }

  // Poll for completion
  for (let attempt = 0; attempt < env.VIDEO_MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(env.VIDEO_POLL_INTERVAL_MS);
    await input.onProgress?.();

    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!statusResponse.ok) continue;

    const status = (await statusResponse.json()) as Record<string, unknown>;
    const statusStr = ((status.status ?? "") as string).toLowerCase();

    if (statusStr === "succeeded") {
      let videoUrl: string | null = null;

      if (typeof status.output === "string") {
        videoUrl = status.output;
      } else if (Array.isArray(status.output) && status.output[0]) {
        videoUrl = status.output[0] as string;
      }

      if (videoUrl) {
        return {
          operationName: predictionId,
          videoUris: [videoUrl],
          videoBytesBase64: [],
          provider: "replicate",
        };
      }

      throw new Error("Replicate prediction succeeded but no video URL found");
    }

    if (statusStr === "failed" || statusStr === "canceled") {
      throw new Error(`Replicate video generation failed: ${(status.error as string) ?? "unknown error"}`);
    }
  }

  throw new Error("Timed out while waiting for Replicate video generation");
}

/**
 * Generate video clip using the specified provider.
 */
export async function generateClip(input: GenerateClipInput): Promise<ClipResult> {
  switch (input.provider) {
    case "xai":
      return generateXAiClip(input);
    case "eliza":
      return generateElizaClip(input);
    case "fal":
      return generateFalClip(input);
    case "replicate":
      return generateReplicateClip(input);
    default:
      throw new Error(`Unknown video provider: ${input.provider}`);
  }
}

/**
 * Try providers in order until one succeeds.
 * Default: eliza -> xai -> fal -> replicate
 */
export async function generateClipWithFallback(
  baseInput: Omit<GenerateClipInput, "provider">,
): Promise<ClipResult> {
  const providers = resolveFallbackProviders();
  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of providers) {
    try {
      return await generateClip({ ...baseInput, provider });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ provider, error: errorMsg });
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error(
    `All video providers failed:\n${errors.map((e) => `- ${e.provider}: ${e.error}`).join("\n")}`,
  );
}
