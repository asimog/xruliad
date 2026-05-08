import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  fetchWithTimeout: vi.fn(),
  processJob: vi.fn(),
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/network/http", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));

vi.mock("@/workers/process-job", () => ({
  processJob: mocks.processJob,
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/lib/network/retry", () => {
  class RetryableError extends Error {}

  return {
    RetryableError,
    isRetryableHttpStatus: (status: number) => status >= 500,
    withRetry: async <T>(fn: () => Promise<T>) => fn(),
  };
});

import { triggerJobProcessing } from "@/lib/jobs/trigger";

function textResponse(status: number, payload: string): Response {
  return new Response(payload, { status });
}

describe("triggerJobProcessing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to local processing when remote worker dispatch fails in production", async () => {
    mocks.getEnv.mockReturnValue({
      NODE_ENV: "production",
      WORKER_URL: "https://worker.example.com",
      WORKER_TOKEN: "secret",
      ALLOW_IN_PROCESS_WORKER: true,
    });
    mocks.fetchWithTimeout.mockResolvedValue(
      textResponse(503, "worker unavailable"),
    );
    mocks.processJob.mockResolvedValue(undefined);

    await triggerJobProcessing("job-1");

    expect(mocks.fetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(mocks.processJob).toHaveBeenCalledWith("job-1");
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      "worker_trigger_falling_back_to_local",
      expect.objectContaining({
        jobId: "job-1",
        errorCode: "worker_trigger_fallback",
      }),
    );
  });

  it("prefers local processing in development when in-process worker is allowed", async () => {
    mocks.getEnv.mockReturnValue({
      NODE_ENV: "development",
      WORKER_URL: "https://worker.example.com",
      WORKER_TOKEN: "secret",
      ALLOW_IN_PROCESS_WORKER: true,
    });
    mocks.processJob.mockResolvedValue(undefined);

    await triggerJobProcessing("job-dev");

    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
    expect(mocks.processJob).toHaveBeenCalledWith("job-dev");
  });

  it("throws the remote worker error when local fallback is disabled", async () => {
    mocks.getEnv.mockReturnValue({
      WORKER_URL: "https://worker.example.com",
      WORKER_TOKEN: "secret",
      ALLOW_IN_PROCESS_WORKER: false,
    });
    mocks.fetchWithTimeout.mockResolvedValue(
      textResponse(503, "worker unavailable"),
    );

    await expect(triggerJobProcessing("job-2")).rejects.toThrow(
      "Failed to trigger worker (503): worker unavailable",
    );
    expect(mocks.processJob).not.toHaveBeenCalled();
  });
});
