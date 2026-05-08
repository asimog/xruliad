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

import { fetchXProfileTweets } from "@/lib/x/api";

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchXProfileTweets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({
      X_API_BEARER_TOKEN: "bearer-token",
      X_API_CONSUMER_KEY: "consumer-key",
      X_API_CONSUMER_SECRET: "consumer-secret",
      X_API_ACCESS_TOKEN: "access-token",
      X_API_ACCESS_TOKEN_SECRET: "access-token-secret",
    });
  });

  it("falls back to OAuth when bearer lookup fails", async () => {
    mocks.fetchWithTimeout
      .mockResolvedValueOnce(jsonResponse(403, { error: "forbidden" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            id: "user-1",
            name: "soboltoshi",
            username: "soboltoshi",
            description: "bio",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(403, { error: "forbidden" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: [
            {
              id: "tweet-1",
              text: "we are so back",
              created_at: "2026-04-13T00:00:00.000Z",
            },
          ],
        }),
      );

    const result = await fetchXProfileTweets({
      profileInput: "@soboltoshi",
      maxTweets: 16,
    });

    expect(result.profile.username).toBe("soboltoshi");
    expect(result.tweets).toHaveLength(1);
    expect(mocks.fetchWithTimeout).toHaveBeenCalledTimes(4);

    const firstAuth = mocks.fetchWithTimeout.mock.calls[0][1].headers.get(
      "Authorization",
    );
    const secondAuth = mocks.fetchWithTimeout.mock.calls[1][1].headers.get(
      "Authorization",
    );

    expect(firstAuth).toBe("Bearer bearer-token");
    expect(secondAuth?.startsWith("OAuth ")).toBe(true);
  });
});
