import { after } from "next/server";
import { logger } from "@/lib/logging/logger";
import { triggerJobProcessing } from "@/lib/jobs/trigger";

export async function triggerJobProcessingSoft(input: {
  jobId: string;
  timeoutMs?: number;
  logContext: {
    event: string;
    component?: string;
    route?: string;
  };
}): Promise<void> {
  const timeoutMs = input.timeoutMs ?? 12_000;

  try {
    await Promise.race([
      triggerJobProcessing(input.jobId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("trigger_timeout")), timeoutMs),
      ),
    ]);
  } catch (triggerError) {
    logger.warn(input.logContext.event, {
      component: input.logContext.component ?? "api",
      route: input.logContext.route,
      jobId: input.jobId,
      errorMessage:
        triggerError instanceof Error ? triggerError.message : "unknown",
    });

    const runRetry = async () => {
      try {
        await triggerJobProcessing(input.jobId);
      } catch (retryError) {
        logger.error("job_trigger_background_retry_failed", {
          component: input.logContext.component ?? "api",
          route: input.logContext.route,
          jobId: input.jobId,
          errorMessage:
            retryError instanceof Error ? retryError.message : "unknown",
        });
      }
    };

    try {
      // Continue dispatch attempt after response to avoid abandoning the job
      // when a request-level timeout fires.
      after(runRetry);
    } catch {
      // Fallback for non-request contexts (tests/dev scripts).
      void runRetry();
    }
  }
}
