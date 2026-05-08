import { POST } from "@/app/api/video/hypermyth/route";
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
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/jobs/repository", () => ({
  createPromptVideoJob: mocks.createPromptVideoJob,
  createTokenVideoJob: mocks.createTokenVideoJob,
}));

vi.mock("@/lib/jobs/auto-input", () => ({
  detectAutoInputType: () => "prompt",
}));

vi.mock("@/lib/memecoins/metadata", () => ({
  resolveMemecoinMetadata: mocks.resolveMemecoinMetadata,
}));

vi.mock("@/lib/jobs/trigger-soft", () => ({
  triggerJobProcessingSoft: mocks.triggerJobProcessingSoft,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/request-ip", () => ({
  getRequestIp: mocks.getRequestIp,
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: mocks.logger,
}));

describe("POST /api/video/hypermyth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.createPromptVideoJob.mockResolvedValue({ jobId: "job-123" });
    mocks.triggerJobProcessingSoft.mockResolvedValue(undefined);
  });

  it("uses the updated two-part HyperMyth prompt wording", async () => {
    const request = new NextRequest("http://localhost/api/video/hypermyth", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ input: "A prophet trapped inside an arcade cabinet" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-123");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: "two_act_cinema",
        requestedPrompt: expect.stringContaining("two-part cinematic short"),
      }),
    );
  });
});
