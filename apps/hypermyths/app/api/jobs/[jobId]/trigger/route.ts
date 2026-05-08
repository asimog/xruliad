// Manual job trigger endpoint — for debugging stuck jobs
// Requires WORKER_TOKEN authentication to prevent unauthorized job re-triggers.
import { NextRequest, NextResponse } from "next/server";
import { processJob } from "@/workers/process-job";
import { logger } from "@/lib/logging/logger";
import { getEnv } from "@/lib/env";
import { secureCompare } from "@/lib/security/crypto";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long-running jobs

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const env = getEnv();
  const workerToken = env.WORKER_TOKEN;
  if (!workerToken) {
    return NextResponse.json(
      { error: "WORKER_TOKEN not configured" },
      { status: 503 },
    );
  }

  const token = extractBearer(request.headers.get("authorization"));
  if (!token || !secureCompare(token, workerToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    await processJob(jobId);
    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    logger.error("manual_job_trigger_failed", {
      component: "api",
      jobId,
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Job trigger failed", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
