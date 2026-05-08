import { NextRequest, NextResponse } from "next/server";

import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { serializeTrailerAsset } from "@/lib/assets/serializer";
import { publishTrailerAsset } from "@/lib/assets/service";
import { getJob } from "@/lib/jobs/repository";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job,
    route: "/api/assets/[jobId]/publish",
  });
  if (!access.ok) {
    return access.response;
  }
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  try {
    const asset = await publishTrailerAsset({ jobId });
    return NextResponse.json({ asset: serializeTrailerAsset(asset) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Publish failed.",
      },
      { status: 400 },
    );
  }
}
