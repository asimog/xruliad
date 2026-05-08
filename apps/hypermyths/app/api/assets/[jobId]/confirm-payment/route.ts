import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { serializeTrailerAsset } from "@/lib/assets/serializer";
import { buildMintPaymentSummary, confirmTrailerAssetPayment } from "@/lib/assets/service";
import { getJob } from "@/lib/jobs/repository";

type Context = {
  params: Promise<{ jobId: string }>;
};

const payloadSchema = z.object({
  signature: z.string().trim().min(1),
});

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job,
    route: "/api/assets/[jobId]/confirm-payment",
  });
  if (!access.ok) {
    return access.response;
  }
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const asset = await confirmTrailerAssetPayment({
      job,
      session: access.session!,
      signature: parsed.data.signature,
    });

    return NextResponse.json({
      asset: serializeTrailerAsset(asset),
      payment: buildMintPaymentSummary(asset),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Payment confirmation failed.",
      },
      { status: 400 },
    );
  }
}
