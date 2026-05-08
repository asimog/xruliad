import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  fetchWithTimeout: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/network/http", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));

import { renderCinematicVideo } from "@/lib/video/client";

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(status: number, payload: string): Response {
  return new Response(payload, { status });
}

describe("video client polling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({
      XAI_API_KEY: "xai-key",
      XAI_VIDEO_API_KEY: "xai-video-key",
      XAI_BASE_URL: "https://video.example.com",
      XAI_VIDEO_BASE_URL: "https://video.example.com",
      XAI_VIDEO_MODEL: "grok-imagine-video",
      VIDEO_RENDER_MAX_POLL_ATTEMPTS: 1,
      VIDEO_RENDER_POLL_INTERVAL_MS: 1,
    });
  }, 15_000);

  it(
    "fails fast on non-retryable polling errors",
    { timeout: 15_000 },
    async () => {
      mocks.fetchWithTimeout
        .mockResolvedValueOnce(jsonResponse(200, { id: "render-1" }))
        .mockResolvedValueOnce(textResponse(401, "Unauthorized"));

      await expect(
        renderCinematicVideo({
          jobId: "job-1",
          wallet: "wallet-1",
          durationSeconds: 30,
          prompt: "Hook line",
        }),
      ).rejects.toThrow("xAI status check failed (401)");

      expect(mocks.fetchWithTimeout).toHaveBeenCalledTimes(2);
    },
  );
});
