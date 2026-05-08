import { POST } from "@/app/api/video/create/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPromptVideoJob: vi.fn(),
  createTokenVideoJob: vi.fn(),
  enforceRateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  requirePrivyAuth: vi.fn(),
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

vi.mock("@/lib/auth/privy-server", () => ({
  getPrivySessionUserId: (session: { user_id?: string; userId?: string }) =>
    session.user_id ?? session.userId ?? "",
  requirePrivyAuth: mocks.requirePrivyAuth,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/request-ip", () => ({
  getRequestIp: mocks.getRequestIp,
}));

describe("POST /api/video/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.requirePrivyAuth.mockResolvedValue({
      ok: true,
      session: { user_id: "did:privy:test-user" },
    });
    mocks.createPromptVideoJob.mockResolvedValue({ jobId: "job-prompt" });
    mocks.createTokenVideoJob.mockResolvedValue({ jobId: "job-token" });
    mocks.triggerJobProcessingSoft.mockResolvedValue(undefined);
  });

  it("creates a prompt job on the mythx multi-act pipeline", async () => {
    const request = new NextRequest("http://localhost/api/video/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "prompt",
        pipeline: "hypermyths_generic_engine",
        value: "A city made of rumors collapses into the sea.",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-prompt");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: "did:privy:test-user",
        visibility: "private",
        pricingMode: "private",
        requestKind: "generic_cinema",
        experience: "funcinema",
        requestedPrompt: expect.stringContaining("HyperMythsGenericEngine"),
      }),
    );
  });

  it("creates an x profile job on the fixed two-act cinema path", async () => {
    const request = new NextRequest("http://localhost/api/video/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "x_profile",
        pipeline: "two_act_cinema",
        value: "@hypermyths",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-prompt");
    expect(mocks.createPromptVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: "did:privy:test-user",
        visibility: "private",
        pricingMode: "private",
        requestKind: "mythx",
        experience: "two_act_cinema",
        sourceMediaUrl: "https://x.com/hypermyths",
        requestedPrompt: expect.stringContaining("two-part internet biography"),
      }),
    );
  });

  it("creates a contract job on the mythx multi-act pipeline", async () => {
    mocks.resolveMemecoinMetadata.mockResolvedValue({
      name: "Myth Coin",
      symbol: "MYTH",
      image: null,
      description: "A token for dramatic testing.",
      chain: "solana",
    });

    const request = new NextRequest("http://localhost/api/video/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "contract_address",
        pipeline: "hypermyths_generic_engine",
        value: "So11111111111111111111111111111111111111112",
        chain: "solana",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobId).toBe("job-token");
    expect(mocks.createTokenVideoJob).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: "did:privy:test-user",
        visibility: "private",
        pricingMode: "private",
        experience: "funcinema",
        requestedPrompt: expect.stringContaining("HyperMythsGenericEngine"),
      }),
    );
  });

  it("rejects requests with an invalid or expired Privy token", async () => {
    mocks.requirePrivyAuth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid or expired Privy access token." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    });

    const request = new NextRequest("http://localhost/api/video/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer expired.token.here",
      },
      body: JSON.stringify({
        inputType: "prompt",
        pipeline: "hypermyths_generic_engine",
        value: "Expired token should be rejected.",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mocks.createPromptVideoJob).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated private studio creation requests", async () => {
    mocks.requirePrivyAuth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    });

    const request = new NextRequest("http://localhost/api/video/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputType: "prompt",
        pipeline: "hypermyths_generic_engine",
        value: "A locked studio with no access token.",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mocks.createPromptVideoJob).not.toHaveBeenCalled();
  });
});
