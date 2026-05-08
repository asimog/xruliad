// Background job polling worker for Railway
// Run: npx tsx worker-poll.ts
// Polls for pending jobs every 30s and processes them.

import { processJob } from "./workers/process-job";
import { db } from "./lib/db";
import { logger } from "./lib/logging/logger";

const POLL_INTERVAL_MS = parseInt(
  process.env.WORKER_POLL_INTERVAL_MS || "30000",
  10,
);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "1", 10);
const PROCESSING_STALE_MS = parseInt(
  process.env.JOB_PROCESSING_STALE_MS || "900000",
  10,
);

let running = 0;
let processed = 0;

async function fetchPendingJobs(): Promise<string[]> {
  try {
    if (!db) {
      logger.warn("worker_no_db", { component: "worker_poll" });
      return [];
    }
    const pendingGraceBefore = new Date(Date.now() - 10_000);
    const staleProcessingBefore = new Date(Date.now() - PROCESSING_STALE_MS);

    // Pick up new pending jobs, paid Pay.sh jobs, and stale processing jobs
    // whose worker likely died mid-pipeline. Pay.sh confirmations leave jobs
    // at `payment_confirmed`; processing claims them atomically below.
    const rows = await db.$queryRaw<Array<{ jobId: string }>>`
      SELECT j."jobId" FROM "Job" j
      WHERE (
        j."status" IN ('pending', 'payment_confirmed')
        AND j."updatedAt" < ${pendingGraceBefore}
      ) OR (
        j."status" = 'processing'
        AND j."updatedAt" < ${staleProcessingBefore}
      )
      ORDER BY j."paymentWaived" DESC, j."createdAt" ASC
      LIMIT ${CONCURRENCY}
    `;
    return rows.map((r) => r.jobId);
  } catch (err) {
    logger.warn("worker_poll_db_error", {
      component: "worker_poll",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    return [];
  }
}

async function pollOnce(): Promise<void> {
  if (running >= CONCURRENCY) return;

  const pending = await fetchPendingJobs();
  if (pending.length === 0) return;

  for (const jobId of pending) {
    if (running >= CONCURRENCY) break;
    running++;
    processed++;

    logger.info("worker_picked_job", {
      component: "worker_poll",
      jobId,
      processedTotal: processed,
    });

    processJob(jobId)
      .then(() => {
        logger.info("worker_job_done", { component: "worker_poll", jobId });
      })
      .catch((err) => {
        logger.error("worker_job_failed", {
          component: "worker_poll",
          jobId,
          errorMessage: err instanceof Error ? err.message : "unknown",
        });
      })
      .finally(() => {
        running--;
      });
  }
}

async function main() {
  logger.info("worker_started", {
    component: "worker_poll",
    pollIntervalMs: POLL_INTERVAL_MS,
    concurrency: CONCURRENCY,
  });

  // Initial poll immediately
  await pollOnce();

  // Then poll on interval
  setInterval(async () => {
    await pollOnce();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  logger.error("worker_crash", {
    component: "worker_poll",
    errorMessage: err instanceof Error ? err.message : "unknown",
  });
  process.exit(1);
});
