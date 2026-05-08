// Worker trigger endpoint — called by Vercel to dispatch job processing.
// Railway runs the Next.js app with no serverless timeout limits,
// so this endpoint can run the full job processing pipeline.
import { after, NextRequest, NextResponse } from "next/server";
import { processJob } from "@/workers/process-job";
import { logger } from "@/lib/logging/logger";
import { assertRequiredEnvGroups } from "@/lib/env-validation";
import { secureCompare } from "@/lib/security/crypto";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Hobby cap for serverless functions

const activeJobs = new Set<string>();

export async function POST(request: NextRequest) {
  assertRequiredEnvGroups(["workerService"], "api/worker/trigger");
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.WORKER_TOKEN?.trim();

  if (!expectedToken) {
    return NextResponse.json(
      { error: "worker token is not configured" },
      { status: 503 },
    );
  }

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ") ||
    !secureCompare(authHeader.slice(7), expectedToken)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { jobId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { jobId } = body;
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  logger.info("worker_triggered", {
    component: "api_worker_trigger",
    jobId,
  });

  if (activeJobs.has(jobId)) {
    return NextResponse.json({ ok: true, jobId, queued: false }, { status: 202 });
  }

  activeJobs.add(jobId);
  after(async () => {
    try {
      await processJob(jobId);
    } catch (err) {
      logger.error("worker_process_failed", {
        component: "api_worker_trigger",
        jobId,
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    } finally {
      activeJobs.delete(jobId);
    }
  });

  return NextResponse.json({ ok: true, jobId, queued: true }, { status: 202 });
}
