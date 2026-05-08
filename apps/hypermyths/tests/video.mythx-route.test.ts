import { POST } from "@/app/api/video/mythx/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPromptVideoJob: vi.fn(),
  triggerJobProcessingSoft: vi.fn(),
  enforceRateLimit: vi.fn(),
  fetchXProfileTweets: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/jobs/repository", () => ({
  createPromptVideoJob: mocks.createPromptVideoJob,
}));

vi.mock("@/lib/jobs/trigger-soft", () => ({
  triggerJobProcessingSoft: mocks.triggerJobProcessingSoft,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/x/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/x/api")>(
    "@/lib/x/api",
  );

  return {
    ...actual,
    fetchXProfileTweets: mocks.fetchXProfileTweets,
  };
});

vi.mock("@/lib/logging/logger", () => ({
  logger: mocks.logger,
}));

function buildRequest(profileInput = "@soboltoshi"): NextRequest {
  return new NextRequest("http://localhost/api/video/mythx", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ profileInput }),
  });
}

describe("POST /api/video/mythx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
    mocks.createPromptVideoJob.mockResolvedValue({ jobId: "job-123" });
    mocks.triggerJobProcessingSoft.mockResolvedValue(undefined);
  });

  it("queues a mythx job with hydrated transcript when the profile lookup succeeds", async () => {
    mocks.fetchXProfileTweets.mockResolvedValue({
      profile: {
        displayName: "soboltoshi",
        username: "soboltoshi",
        profileUrl: "https://x.com/soboltoshi",
        description: "bio",
        profileImageUrl: null,
      },
      tweets: [{ id: "tweet-1", text: "we are so back", createdAt: null }],
      transcript: "1. we are so back",
    });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-123");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectName: "soboltoshi",
        sourceMediaUrl: "https://x.com/soboltoshi",
        sourceTranscript: "1. we are so back",
      }),
    );
    expect(mocks.triggerJobProcessingSoft).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-123" }),
    );
  });

  it("defers profile hydration to the worker when live lookup auth fails", async () => {
    mocks.fetchXProfileTweets.mockRejectedValue(
      new Error("X API authentication failed while resolving the X profile."),
    );

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-123");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectName: "@soboltoshi",
        sourceMediaUrl: "https://x.com/soboltoshi",
        sourceTranscript: undefined,
      }),
    );
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      "mythx_profile_lookup_deferred_to_worker",
      expect.objectContaining({
        profileInput: "@soboltoshi",
        errorCode: "mythx_profile_lookup_deferred",
      }),
    );
  });
});
