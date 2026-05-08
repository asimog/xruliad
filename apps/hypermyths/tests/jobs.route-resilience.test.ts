import { GET } from "@/app/api/jobs/[jobId]/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getJobArtifacts: vi.fn(),
}));

vi.mock("@/lib/jobs/repository", () => ({
  getJobArtifacts: mocks.getJobArtifacts,
}));

describe("GET /api/jobs/[jobId] resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns degraded 200 payload on DB pool exhaustion", async () => {
    mocks.getJobArtifacts.mockRejectedValue(
      new Error(
        "MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size",
      ),
    );

    const req = new NextRequest("http://localhost/api/jobs/job-1");
    const res = await GET(req, { params: Promise.resolve({ jobId: "job-1" }) });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.job.jobId).toBe("job-1");
    expect(payload.status).toBe("processing");
    expect(payload.degraded).toBe(true);
    expect(payload.message).toContain("MaxClientsInSessionMode");
  });
});
