import { GET } from "@/app/api/jobs/[jobId]/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizePrivateJobAccess: vi.fn(),
  getJobArtifacts: vi.fn(),
  recoverJobIfNeeded: vi.fn(),
  isStorageConfigured: vi.fn(),
  isEphemeralProviderUrl: vi.fn(),
}));

vi.mock("@/lib/auth/private-job-access", () => ({
  authorizePrivateJobAccess: mocks.authorizePrivateJobAccess,
}));

vi.mock("@/lib/jobs/repository", () => ({
  getJobArtifacts: mocks.getJobArtifacts,
}));

vi.mock("@/lib/jobs/recovery", () => ({
  recoverJobIfNeeded: mocks.recoverJobIfNeeded,
}));

vi.mock("@/lib/storage/s3", () => ({
  isStorageConfigured: mocks.isStorageConfigured,
  isEphemeralProviderUrl: mocks.isEphemeralProviderUrl,
}));

vi.mock("@/lib/assets/repository", () => ({
  getTrailerAssetByJobId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/assets/serializer", () => ({
  serializeTrailerAsset: vi.fn().mockReturnValue(null),
}));

describe("GET /api/jobs/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getJobArtifacts.mockResolvedValue({
      job: {
        jobId: "job-private",
        status: "processing",
        progress: "pending",
        visibility: "private",
      },
      report: null,
      video: null,
    });
    mocks.authorizePrivateJobAccess.mockResolvedValue({
      ok: true,
      session: { userId: "did:privy:test-user" },
    });
    mocks.recoverJobIfNeeded.mockResolvedValue(null);
    mocks.isStorageConfigured.mockReturnValue(false);
    mocks.isEphemeralProviderUrl.mockReturnValue(false);
  });

  it("returns private jobs when the owner is authorized", async () => {
    const request = new NextRequest("http://localhost/api/jobs/job-private");
    const response = await GET(request, {
      params: Promise.resolve({ jobId: "job-private" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.job.jobId).toBe("job-private");
    expect(mocks.authorizePrivateJobAccess).toHaveBeenCalled();
  });

  it("passes through public jobs without requiring authentication", async () => {
    mocks.getJobArtifacts.mockResolvedValue({
      job: {
        jobId: "job-public",
        status: "ready",
        progress: "done",
        visibility: "public",
      },
      report: null,
      video: null,
    });
    mocks.authorizePrivateJobAccess.mockResolvedValue({ ok: true, session: null });

    const request = new NextRequest("http://localhost/api/jobs/job-public");
    const response = await GET(request, {
      params: Promise.resolve({ jobId: "job-public" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.authorizePrivateJobAccess).toHaveBeenCalled();
  });

  it("blocks private jobs when the wrong user tries to access them", async () => {
    mocks.authorizePrivateJobAccess.mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ error: "You do not have access to this private job." }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    });

    const request = new NextRequest("http://localhost/api/jobs/job-private", {
      headers: { authorization: "Bearer did:privy:other-user" },
    });
    const response = await GET(request, {
      params: Promise.resolve({ jobId: "job-private" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.getJobArtifacts).toHaveBeenCalled();
  });

  it("returns 500 for a private job missing a creatorId", async () => {
    mocks.getJobArtifacts.mockResolvedValue({
      job: {
        jobId: "job-misconfigured",
        status: "ready",
        progress: "done",
        visibility: "private",
        creatorId: null,
      },
      report: null,
      video: null,
    });
    mocks.authorizePrivateJobAccess.mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Private job has no owner recorded." }),
        { status: 500, headers: { "content-type": "application/json" } },
      ),
    });

    const request = new NextRequest("http://localhost/api/jobs/job-misconfigured", {
      headers: { authorization: "Bearer did:privy:test-user" },
    });
    const response = await GET(request, {
      params: Promise.resolve({ jobId: "job-misconfigured" }),
    });

    expect(response.status).toBe(500);
  });

  it("blocks private jobs when authorization fails", async () => {
    mocks.authorizePrivateJobAccess.mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ error: "You do not have access to this private job." }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      ),
    });

    const request = new NextRequest("http://localhost/api/jobs/job-private");
    const response = await GET(request, {
      params: Promise.resolve({ jobId: "job-private" }),
    });

    expect(response.status).toBe(403);
  });
});
