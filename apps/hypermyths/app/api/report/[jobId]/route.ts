import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { getJob, getReport } from "@/lib/jobs/repository";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { isAllowedStoredRedirectUrl } from "@/lib/security/url-allowlist";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const ip = getRequestIp(request);
  const rateLimit = await enforceRateLimit({
    scope: "api_report_download",
    key: ip,
    rules: [{ name: "report_10_per_minute", windowSec: 60, limit: 10 }],
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests.", retryAfterSec: rateLimit.retryAfterSec },
      { status: 429 },
    );
  }

  const { jobId } = await context.params;
  const job = await getJob(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job,
    route: "/api/report/[jobId]",
  });
  if (!access.ok) {
    return access.response;
  }

  const report = await getReport(jobId);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (
    report.downloadUrl &&
    !report.downloadUrl.includes(`/api/report/${jobId}`) &&
    isAllowedStoredRedirectUrl(report.downloadUrl, request.url)
  ) {
    return NextResponse.redirect(new URL(report.downloadUrl, request.url), 302);
  }

  return NextResponse.redirect(
    new URL(`/api/video/${jobId}?download=true`, request.url),
    302,
  );
}
