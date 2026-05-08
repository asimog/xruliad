import { NextRequest, NextResponse } from "next/server";

import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { serializeTrailerAsset } from "@/lib/assets/serializer";
import { mintTrailerAsset } from "@/lib/assets/service";
import { getJobArtifacts } from "@/lib/jobs/repository";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const artifacts = await getJobArtifacts(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job: artifacts.job,
    route: "/api/assets/[jobId]/mint",
  });
  if (!access.ok) {
    return access.response;
  }
  if (!artifacts.job || !artifacts.video || artifacts.video.renderStatus !== "ready") {
    return NextResponse.json(
      { error: "Rendered trailer not found." },
      { status: 404 },
    );
  }

  try {
    const asset = await mintTrailerAsset({
      job: artifacts.job,
      report: artifacts.report,
      video: artifacts.video,
      session: access.session!,
    });

    return NextResponse.json({ asset: serializeTrailerAsset(asset) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Minting failed.",
      },
      { status: 400 },
    );
  }
}
