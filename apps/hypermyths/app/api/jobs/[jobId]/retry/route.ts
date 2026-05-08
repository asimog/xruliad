import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { getJob } from "@/lib/jobs/repository";
import { retryFailedJob } from "@/lib/jobs/retry";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { getEnv } from "@/lib/env";
import { secureCompare } from "@/lib/security/crypto";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { logger } from "@/lib/logging/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ jobId: string }>;
};

function bearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function authorizePublicRetry(request: NextRequest): NextResponse | null {
  const adminSecret = getEnv().ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { ok: false, error: "Public job retry requires ADMIN_SECRET." },
      { status: 503 },
    );
  }

  const token = bearerToken(request);
  if (!token || !secureCompare(token, adminSecret)) {
    return NextResponse.json(
      { ok: false, error: "Admin authorization required." },
      { status: 401 },
    );
  }

  return null;
}

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  if (!jobId || jobId.trim().length < 8) {
    return NextResponse.json(
      { ok: false, error: "Invalid jobId" },
      { status: 400 },
    );
  }

  const normalizedJobId = jobId.trim();

  try {
    const job = await getJob(normalizedJobId);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: "Job not found" },
        { status: 404 },
      );
    }

    if (job.visibility === "private") {
      const access = await authorizePrivateJobAccess({
        request,
        job,
        route: "/api/jobs/[jobId]/retry",
      });
      if (!access.ok) {
        return access.response;
      }
    } else {
      const adminResponse = authorizePublicRetry(request);
      if (adminResponse) return adminResponse;
    }

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_jobs_retry_post",
      key: `${ip}:${normalizedJobId}`,
      rules: [
        { name: "retry_job_per_minute", windowSec: 60, limit: 3 },
        { name: "retry_job_per_hour", windowSec: 60 * 60, limit: 10 },
      ],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rate limit exceeded",
          retryAfterSec: rateLimit.retryAfterSec,
          rule: rateLimit.exceededRule,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        },
      );
    }

    const result = await retryFailedJob(normalizedJobId);
    if (result.status === "skipped") {
      return NextResponse.json(
        { ok: false, error: "Retry skipped", ...result },
        { status: 409 },
      );
    }

    // Actually trigger job processing after preparing for retry
    try {
      await triggerJobProcessing(normalizedJobId);
    } catch (error) {
      logger.warn("retry_trigger_failed", {
        jobId: normalizedJobId,
        error: error instanceof Error ? error.message : "unknown",
      });
      // Don't fail the response - job is prepared, trigger failure is logged
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown retry error";
    return NextResponse.json(
      { ok: false, error: "Failed to retry job", message },
      { status: 500 },
    );
  }
}
