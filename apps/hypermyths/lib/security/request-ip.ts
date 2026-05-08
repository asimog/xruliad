import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { isIP } from "node:net";

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isIP(trimmed) ? trimmed : null;
}

export function getRequestIp(request: NextRequest): string {
  const explicitTrustProxyHeaders =
    process.env.TRUST_PROXY_IP_HEADERS === "true";

  const cloudflareIp = Boolean(request.headers.get("cf-ray"))
    ? normalizeIp(request.headers.get("cf-connecting-ip"))
    : null;
  if (cloudflareIp) {
    return cloudflareIp;
  }

  if (explicitTrustProxyHeaders) {
    const realIp = normalizeIp(request.headers.get("x-real-ip"));
    if (realIp) {
      return realIp;
    }

    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const chain = forwarded
        .split(",")
        .map((part) => normalizeIp(part))
        .filter((ip): ip is string => Boolean(ip));

      // Standard X-Forwarded-For order is client -> proxy chain.
      // Prefer the left-most value only when proxy headers are trusted.
      const first = chain[0];
      if (first) {
        return first;
      }
    }
  }

  // Stable fallback fingerprint so repeated callers without trusted proxy headers
  // still land in the same rate-limit bucket.
  const fingerprint = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
    request.headers.get("sec-ch-ua") ?? "",
    request.headers.get("host") ?? "",
  ].join("|");
  const digest = createHash("sha256")
    .update(fingerprint || "unknown-client")
    .digest("hex")
    .slice(0, 16);
  return `fallback-${digest}`;
}
