import {
  PrivyClient,
  verifyAccessToken,
  type VerifyAccessTokenResponse,
} from "@privy-io/node";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logging/logger";

type PrivyServerConfig = {
  appId: string;
  appSecret: string;
  jwtVerificationKey?: string;
};

export type PrivySession = VerifyAccessTokenResponse;

let cachedPrivyClient: PrivyClient | null | undefined;

export function getPrivySessionUserId(session: PrivySession): string {
  return session.user_id;
}

function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

function getPrivyServerConfig(): PrivyServerConfig {
  return {
    appId: trim(process.env.PRIVY_APP_ID) || trim(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    appSecret: trim(process.env.PRIVY_APP_SECRET),
    jwtVerificationKey: trim(process.env.PRIVY_JWT_VERIFICATION_KEY) || undefined,
  };
}

export function isPrivyServerConfigured(): boolean {
  const config = getPrivyServerConfig();
  return Boolean(config.appId && (config.jwtVerificationKey || config.appSecret));
}

export function extractPrivyAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieToken = request.cookies.get("privy-token")?.value?.trim();
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

type TokenSource = { token: string; fromCookie: boolean };

function extractTokenSource(request: NextRequest): TokenSource | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return { token: bearer, fromCookie: false };
  }
  const cookieToken = request.cookies.get("privy-token")?.value?.trim();
  if (cookieToken && cookieToken.length > 0) return { token: cookieToken, fromCookie: true };
  return null;
}

function isRequestOriginAllowed(request: NextRequest): boolean {
  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (!baseUrl) {
    // CRITICAL FIX: Fail-secure if APP_BASE_URL not configured
    logger.error("csrf_protection_disabled_missing_config", {
      component: "auth",
      reason: "APP_BASE_URL not set - cannot validate origin",
    });
    return false; // Reject all cross-origin requests when config missing
  }

  try {
    const expectedOrigin = new URL(baseUrl).origin;
    
    // CRITICAL FIX: Check origin header first (most reliable)
    const origin = request.headers.get("origin");
    if (origin) {
      if (origin !== expectedOrigin) {
        logger.warn("csrf_origin_mismatch", {
          component: "auth",
          expectedOrigin,
          receivedOrigin: origin,
        });
        return false;
      }
      return true;
    }

    // Fallback to referer header
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (refererOrigin !== expectedOrigin) {
          logger.warn("csrf_referer_mismatch", {
            component: "auth",
            expectedOrigin,
            receivedOrigin: refererOrigin,
          });
          return false;
        }
        return true;
      } catch {
        logger.warn("csrf_referer_parse_failed", {
          component: "auth",
          referer,
        });
        return false;
      }
    }

    // CRITICAL FIX: Reject if BOTH origin and referer headers are missing
    // Missing headers could indicate a CSRF attack (some browsers omit headers in CORS)
    logger.warn("csrf_missing_both_headers", {
      component: "auth",
      reason: "Neither origin nor referer header present",
    });
    return false;
  } catch (error) {
    logger.error("csrf_validation_error", {
      component: "auth",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

export async function verifyPrivyAccessToken(
  accessToken: string,
): Promise<PrivySession> {
  const config = getPrivyServerConfig();

  if (!config.appId) {
    throw new Error("PRIVY_APP_ID is not configured.");
  }

  if (config.jwtVerificationKey) {
    return verifyAccessToken({
      access_token: accessToken,
      app_id: config.appId,
      verification_key: config.jwtVerificationKey,
    });
  }

  if (config.appSecret) {
    if (!cachedPrivyClient) {
      const client = new PrivyClient({
        appId: config.appId,
        appSecret: config.appSecret,
      });
      cachedPrivyClient = client;
    }

    return cachedPrivyClient.utils().auth().verifyAccessToken(accessToken);
  }

  throw new Error(
    "Set PRIVY_JWT_VERIFICATION_KEY or PRIVY_APP_SECRET before enabling protected routes.",
  );
}

export async function getOptionalPrivySession(
  request: NextRequest,
): Promise<PrivySession | null> {
  const accessToken = extractPrivyAccessToken(request);
  if (!accessToken) return null;

  try {
    return await verifyPrivyAccessToken(accessToken);
  } catch (error) {
    logger.warn("privy_auth_token_verification_failed", {
      component: "auth",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

export async function requirePrivyAuth(
  request: NextRequest,
): Promise<
  | { ok: true; session: PrivySession }
  | { ok: false; response: NextResponse }
> {
  if (!isPrivyServerConfigured()) {
    logger.error("privy_server_auth_not_configured", {
      component: "auth",
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Privy server authentication is not configured. Set PRIVY_APP_ID and PRIVY_JWT_VERIFICATION_KEY before using private studio routes.",
        },
        { status: 503 },
      ),
    };
  }

  const tokenSource = extractTokenSource(request);
  if (!tokenSource) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  if (tokenSource.fromCookie && !isRequestOriginAllowed(request)) {
    logger.warn("privy_auth_csrf_rejected", {
      component: "auth",
      origin: request.headers.get("origin") ?? request.headers.get("referer") ?? "none",
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Cross-origin request rejected." },
        { status: 403 },
      ),
    };
  }

  try {
    const session = await verifyPrivyAccessToken(tokenSource.token);
    logger.info("privy_auth_success", {
      component: "auth",
      userId: getPrivySessionUserId(session),
    });
    return { ok: true, session };
  } catch (error) {
    logger.warn("privy_auth_rejected", {
      component: "auth",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or expired Privy access token." },
        { status: 401 },
      ),
    };
  }
}
