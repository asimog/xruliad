import { NextRequest, NextResponse } from "next/server";

import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { serializeTrailerAsset } from "@/lib/assets/serializer";
import { prepareTrailerAssetQuote, buildMintPaymentSummary } from "@/lib/assets/service";
import { getJob, getVideo } from "@/lib/jobs/repository";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);
  const video = await getVideo(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job,
    route: "/api/assets/[jobId]/quote",
  });
  if (!access.ok) {
    return access.response;
  }
  if (!job || !video) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  if (job.visibility !== "private") {
    return NextResponse.json(
      { error: "Only private creations can enter the mint flow." },
      { status: 400 },
    );
  }
  if (job.status !== "complete" || video.renderStatus !== "ready") {
    return NextResponse.json(
      { error: "Finish rendering the trailer before requesting a mint quote." },
      { status: 400 },
    );
  }

  const asset = await prepareTrailerAssetQuote({
    job,
    session: access.session!,
  });

  return NextResponse.json({
    asset: serializeTrailerAsset(asset),
    payment: buildMintPaymentSummary(asset),
  });
}
