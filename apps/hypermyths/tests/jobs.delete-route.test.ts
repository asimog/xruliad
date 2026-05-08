import { DELETE } from "@/app/api/jobs/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteFailedJobs: vi.fn(),
  getEnv: vi.fn(),
  secureCompare: vi.fn(),
}));

vi.mock("@/lib/jobs/repository", () => ({
  createPromptVideoJob: vi.fn(),
  createTokenVideoJob: vi.fn(),
  deleteFailedJobs: mocks.deleteFailedJobs,
  findRecentReusableTokenJob: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/security/crypto", () => ({
  secureCompare: mocks.secureCompare,
}));

vi.mock("@/lib/memecoins/metadata", () => ({
  resolveMemecoinMetadata: vi.fn(),
}));

vi.mock("@/lib/packages", () => ({
  getPackageConfig: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/request-ip", () => ({
  getRequestIp: vi.fn(),
}));

vi.mock("@/lib/cinema/config", () => ({
  getCinemaPackageConfig: vi.fn(),
}));

describe("DELETE /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({ ADMIN_SECRET: "secret-123" });
    mocks.secureCompare.mockImplementation(
      (provided: string, expected: string) => provided === expected,
    );
  });

  it("deletes failed jobs only when explicitly requested", async () => {
    mocks.deleteFailedJobs.mockResolvedValue({
      deletedCount: 2,
      deletedJobIds: ["job-failed-1", "job-failed-2"],
    });

    const request = new NextRequest(
      "http://localhost/api/jobs?status=failed&limit=10",
      {
        method: "DELETE",
        headers: {
          authorization: "Bearer secret-123",
        },
      },
    );

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.deleteFailedJobs).toHaveBeenCalledWith({ limit: 10 });
    expect(body.deletedStatus).toBe("failed");
    expect(body.deletedCount).toBe(2);
  });

  it("rejects delete requests that do not explicitly target failed jobs", async () => {
    const request = new NextRequest("http://localhost/api/jobs?status=complete", {
      method: "DELETE",
      headers: {
        authorization: "Bearer secret-123",
      },
    });

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.requiredStatus).toBe("failed");
    expect(mocks.deleteFailedJobs).not.toHaveBeenCalled();
  });
});
