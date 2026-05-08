import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/**
 * Securely compare two secrets using constant-time comparison to prevent timing attacks.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Use timingSafeEqual with padded buffers to avoid length-based timing leaks
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.alloc(a.length);
    const bOrig = Buffer.from(b);
    bOrig.copy(bBuf, 0, 0, Math.min(b.length, a.length));
    return timingSafeEqual(aBuf, bBuf) && false; // Always fail if lengths differ
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Validate that a URL is safe to fetch (not SSRF).
 * - Only allows http/https protocols
 * - Blocks private IP ranges (RFC 1918, link-local, loopback)
 * - Blocks localhost and metadata endpoints
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost, loopback, and metadata endpoints
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal" ||
      hostname === "169.254.169.254" || // AWS metadata
      hostname === "metadata.azure.com" // Azure metadata
    ) {
      return false;
    }
    
    // Block private IP ranges
    if (isIP(hostname)) {
      const octets = hostname.split(".").map(Number);
      if (octets.length === 4) {
        // 10.0.0.0/8
        if (octets[0] === 10) return false;
        // 172.16.0.0/12
        if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;
        // 192.168.0.0/16
        if (octets[0] === 192 && octets[1] === 168) return false;
        // 127.0.0.0/8 (loopback)
        if (octets[0] === 127) return false;
        // 169.254.0.0/16 (link-local)
        if (octets[0] === 169 && octets[1] === 254) return false;
        // 0.0.0.0/8
        if (octets[0] === 0) return false;
      }
    }
    
    return true;
  } catch {
    // Invalid URL
    return false;
  }
}
