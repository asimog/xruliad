import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logging/logger";
import type { JobDocument } from "@/lib/types/domain";

import {
  getPrivySessionUserId,
  requirePrivyAuth,
  type PrivySession,
} from "./privy-server";

export async function authorizePrivateJobAccess(input: {
  request: NextRequest;
  job: JobDocument | null;
  route: string;
}): Promise<
  | { ok: true; session: PrivySession | null }
  | { ok: false; response: NextResponse }
> {
  if (!input.job) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Job not found" }, { status: 404 }),
    };
  }

  if (input.job.visibility !== "private") {
    return { ok: true, session: null };
  }

  const auth = await requirePrivyAuth(input.request);
  if (!auth.ok) {
    return auth;
  }

  if (!input.job.creatorId) {
    logger.warn("private_job_missing_creator_id", {
      component: "auth",
      route: input.route,
      jobId: input.job.jobId,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Private job is misconfigured." },
        { status: 403 },
      ),
    };
  }

  const sessionUserId = getPrivySessionUserId(auth.session);

  if (sessionUserId !== input.job.creatorId) {
    logger.warn("private_job_access_forbidden", {
      component: "auth",
      route: input.route,
      jobId: input.job.jobId,
      requestedBy: sessionUserId,
      ownerId: input.job.creatorId,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You do not have access to this private job." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session: auth.session };
}
