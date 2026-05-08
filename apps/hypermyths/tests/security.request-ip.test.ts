import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRequestIp } from "@/lib/security/request-ip";

describe("request IP extraction", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY_IP_HEADERS;
  });

  it("uses Cloudflare client IP only when the Cloudflare marker is present", () => {
    const request = new NextRequest("http://localhost/test", {
      headers: {
        "cf-ray": "abc123",
        "cf-connecting-ip": "203.0.113.1",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });

    expect(getRequestIp(request)).toBe("203.0.113.1");
  });

  it("uses proxy headers only when explicitly configured", () => {
    process.env.TRUST_PROXY_IP_HEADERS = "true";
    const request = new NextRequest("http://localhost/test", {
      headers: {
        "x-vercel-id": "iad1::abc123",
        "x-real-ip": "203.0.113.1",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });

    expect(getRequestIp(request)).toBe("203.0.113.1");
  });

  it("does not trust x-forwarded-for just because a Vercel marker exists", () => {
    const request = new NextRequest("http://localhost/test", {
      headers: {
        "x-vercel-id": "iad1::abc123",
        "x-forwarded-for": "198.51.100.9, 203.0.113.44",
      },
    });

    expect(getRequestIp(request)).toMatch(/^fallback-/);
  });

  it("falls back to deterministic fingerprint for untrusted proxy headers", () => {
    const request = new NextRequest("http://localhost/test", {
      headers: {
        "x-forwarded-for": "198.51.100.9, 203.0.113.44",
        "user-agent": "vitest-agent",
      },
    });

    expect(getRequestIp(request)).toMatch(/^fallback-/);
  });
});
