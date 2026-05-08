import { POST } from "@/app/api/video/public-create/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPromptVideoJob: vi.fn(),
  createTokenVideoJob: vi.fn(),
  enforceRateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  resolveMemecoinMetadata: vi.fn(),
  triggerJobProcessingSoft: vi.fn(),
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/jobs/repository", () => ({
  createPromptVideoJob: mocks.createPromptVideoJob,
  createTokenVideoJob: mocks.createTokenVideoJob,
}));

vi.mock("@/lib/jobs/trigger-soft", () => ({
  triggerJobProcessingSoft: mocks.triggerJobProcessingSoft,
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("@/lib/memecoins/metadata", () => ({
  resolveMemecoinMetadata: mocks.resolveMemecoinMetadata,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/request-ip", () => ({
  getRequestIp: mocks.getRequestIp,
}));

describe("POST /api/video/public-create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.createPromptVideoJob.mockResolvedValue({ jobId: "job-public-profile" });
    mocks.createTokenVideoJob.mockResolvedValue({ jobId: "job-public-token" });
    mocks.triggerJobProcessingSoft.mockResolvedValue(undefined);
  });

  it("creates an x profile job on the public two-act route", async () => {
    const request = new NextRequest("http://localhost/api/video/public-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "x_profile",
        value: "@hypermyths",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-public-profile");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestKind: "mythx",
        experience: "two_act_cinema",
        sourceMediaUrl: "https://x.com/hypermyths",
      }),
    );
  });

  it("rejects prompt mode on the public route", async () => {
    const request = new NextRequest("http://localhost/api/video/public-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "prompt",
        value: "This should not be accepted publicly.",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.createPromptVideoJob).not.toHaveBeenCalled();
  });

  it("creates a token job on the public two-act route", async () => {
    mocks.resolveMemecoinMetadata.mockResolvedValue({
      name: "Myth Coin",
      symbol: "MYTH",
      image: null,
      description: "A token for dramatic testing.",
      chain: "solana",
    });

    const request = new NextRequest("http://localhost/api/video/public-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "contract_address",
        value: "So11111111111111111111111111111111111111112",
        chain: "solana",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-public-token");
    expect(mocks.createTokenVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: "two_act_cinema",
        requestedPrompt: expect.stringContaining("2-Act Cinema"),
      }),
    );
  });

  it("enforces the public one-per-day limit", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSec: 86_400,
    });

    const request = new NextRequest("http://localhost/api/video/public-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "x_profile",
        value: "@hypermyths",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.retryAfterSec).toBe(86_400);
    expect(mocks.createPromptVideoJob).not.toHaveBeenCalled();
  });
});
