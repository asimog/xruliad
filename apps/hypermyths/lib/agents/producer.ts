// Producer — xAI video generation only
import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { logger } from "@/lib/logging/logger";
import {
  enforceAudioStyleConstraint,
  enforceNoTextVideoConstraint,
} from "@/lib/video/prompt-guard";

// xAI valid sizes: 848x480, 1696x960, 1280x720, 1920x1080
const XAI_VIDEO_SIZE = "1280x720";
const RENDER_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  error?: string;
}

export async function generateVideo(
  script: { hook?: string; scenes?: Array<{ visualPrompt?: string; narration?: string }> },
  direction: { style?: string; pacing?: string },
  _jobId: string,
): Promise<RenderResult> {
  const prompt = [
    script.hook ? `Hook: ${script.hook}` : null,
    script.scenes?.map((scene) => scene.visualPrompt ?? scene.narration ?? "").filter(Boolean).join(" ") ?? null,
    direction.style ? `Style: ${direction.style}` : null,
    direction.pacing ? `Pacing: ${direction.pacing}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return renderWithxAI(prompt || "Create a cinematic short.", "1:1", 8);
}

/**
 * Direct xAI video generation.
 * Prompt should be a vivid visual description.
 */
export async function renderWithxAI(
  prompt: string,
  _aspectRatio: string, // kept for API compat but xAI ignores it
  duration: number,
): Promise<RenderResult> {
  const guardedPrompt = enforceAudioStyleConstraint(
    enforceNoTextVideoConstraint(prompt),
  );
  const env = getEnv();

  const apiKey = env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY;
  const baseUrl = env.XAI_VIDEO_BASE_URL ?? env.XAI_BASE_URL;

  if (!apiKey) {
    return { success: false, error: "xAI video API key is not configured." };
  }
  if (!baseUrl) {
    return { success: false, error: "xAI video base URL is not configured." };
  }

  const model = env.XAI_VIDEO_MODEL ?? "grok-imagine-video";

  logger.info("producer_xai_render_starting", {
    component: "agents_producer",
    stage: "renderWithxAI",
    model,
    prompt: guardedPrompt.slice(0, 100),
    duration,
  });

  try {
    const response = await withRetry(
      async () => {
        const res = await fetchWithTimeout(
          `${baseUrl.replace(/\/+$/, "")}/videos/generations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              prompt: guardedPrompt,
              size: XAI_VIDEO_SIZE,
              duration_seconds: Math.min(10, Math.max(3, Math.floor(duration))),
            }),
          },
          RENDER_TIMEOUT_MS,
        );

        if (!res.ok) {
          const body = await res.text();
          if (isRetryableHttpStatus(res.status)) {
            throw new RetryableError(
              `xAI video request failed (${res.status}): ${body}`,
            );
          }
          throw new Error(`xAI video request failed (${res.status}): ${body}`);
        }

        return res;
      },
      { attempts: 3, baseDelayMs: 1000, maxDelayMs: 5000 },
    );

    const payload = (await response.json()) as {
      request_id?: string;
      data?: Array<{ url?: string }>;
      video?: { url?: string };
      error?: { message?: string };
    };

    // xAI returns either:
    // 1. Sync: { video: { url: "..." } }
    // 2. Async: { request_id: "..." } — need to poll
    // 3. Array format: { data: [{ url: "..." }] }
    const videoUrl = payload.video?.url ?? payload.data?.[0]?.url;
    const requestId = payload.request_id;

    if (videoUrl) {
      logger.info("producer_xai_render_completed", {
        component: "agents_producer",
        stage: "renderWithxAI",
        videoUrl: videoUrl.slice(0, 100),
      });
      return { success: true, videoUrl, thumbnailUrl: null };
    }

    if (!requestId) {
      return {
        success: false,
        error: payload.error?.message ?? "xAI returned an empty response.",
      };
    }

    // Async: poll for completion
    logger.info("producer_xai_polling", {
      component: "agents_producer",
      stage: "renderWithxAI",
      requestId,
    });

    for (let attempt = 0; attempt < 180; attempt++) {
      await sleep(5000);

      try {
        const statusRes = await fetchWithTimeout(
          `${baseUrl.replace(/\/+$/, "")}/videos/${encodeURIComponent(requestId)}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${apiKey}` },
          },
          15000,
        );

        if (!statusRes.ok) continue;

        const statusPayload = (await statusRes.json()) as {
          status?: string;
          video?: { url?: string };
          error?: string | { message?: string };
        };

        const status = (statusPayload.status ?? "").toLowerCase();

        if (
          status === "done" ||
          status === "completed" ||
          status === "ready" ||
          status === "succeeded"
        ) {
          const url = statusPayload.video?.url;
          if (url) {
            return { success: true, videoUrl: url, thumbnailUrl: null };
          }
          return {
            success: false,
            error: "xAI video complete but no URL returned.",
          };
        }

        if (status === "failed" || status === "error") {
          const err =
            typeof statusPayload.error === "string"
              ? statusPayload.error
              : statusPayload.error?.message;
          return {
            success: false,
            error: err ?? "xAI video generation failed.",
          };
        }
      } catch {
        continue; // Keep polling on transient errors
      }
    }

    return {
      success: false,
      error: "xAI video generation timed out after 15 minutes.",
    };
  } catch (error) {
    logger.warn("producer_xai_render_failed", {
      component: "agents_producer",
      stage: "renderWithxAI",
      errorCode: "xai_render_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "xAI render failed.",
    };
  }
}
