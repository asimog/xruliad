import { NextRequest, NextResponse } from "next/server";

import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { getTrailerAssetByJobId } from "@/lib/assets/repository";
import { serializeTrailerAsset } from "@/lib/assets/serializer";
import { getJob } from "@/lib/jobs/repository";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job,
    route: "/api/assets/[jobId]",
  });
  if (!access.ok) {
    return access.response;
  }

  const asset = await getTrailerAssetByJobId(jobId);
  return NextResponse.json({
    job,
    asset: serializeTrailerAsset(asset),
  });
}
