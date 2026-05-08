import { GET } from "@/app/api/autonomous/feed/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    job: {
      findMany: mocks.findMany,
    },
  },
}));

async function readFirstSseChunk(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Missing response body");
  }
  const first = await reader.read();
  await reader.cancel();
  return new TextDecoder().decode(first.value);
}

describe("GET /api/autonomous/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes ready video metadata in the initial snapshot for embedded feed players", async () => {
    mocks.findMany.mockResolvedValue([
      {
        jobId: "job-1",
        status: "complete",
        progress: "complete",
        requestKind: "mythx",
        subjectName: "Atlas",
        subjectSymbol: "ATL",
        stylePreset: "hyperflow_assembly",
        videoSeconds: 30,
        experience: "mythx",
        requestedPrompt: "cinematic storm",
        createdAt: new Date("2026-04-18T10:00:00Z"),
        updatedAt: new Date("2026-04-18T10:05:00Z"),
        video: {
          renderStatus: "ready",
          thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        },
      },
    ]);

    const controller = new AbortController();
    const request = new NextRequest("http://localhost/api/autonomous/feed", {
      signal: controller.signal,
    });

    const response = await GET(request);
    const chunk = await readFirstSseChunk(response);
    controller.abort();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalled();
    expect(chunk).toContain("\"jobId\":\"job-1\"");
    expect(chunk).toContain("\"renderStatus\":\"ready\"");
    expect(chunk).toContain("\"thumbnailUrl\":\"https://cdn.example.com/thumb.jpg\"");
  });
});
