import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createComputeJob } from "@/lib/pay/compute-intermediary";
import type { PayShOperation } from "@/lib/pay/intermediary";

export const runtime = "nodejs";

const createJobSchema = z.object({
  jobId: z.string().trim().min(1),
  wallet: z.string().trim().min(32).max(44),
  kind: z.enum(["image_generation", "video_generation", "inference"]),
  mint: z.string().trim().min(32).max(44),
  requestKind: z.string().trim().optional(),
  requestedPrompt: z.string().trim().optional(),
  subjectName: z.string().trim().optional(),
  subjectSymbol: z.string().trim().optional(),
  subjectImage: z.string().optional(),
  subjectDescription: z.string().optional(),
  packageType: z.enum(["30s", "60s"]).optional(),
  rangeDays: z.number().int().min(1).optional(),
  priceSol: z.number().min(0).optional(),
  videoSeconds: z.number().int().min(1).optional(),
  operations: z
    .array(
      z.object({
        endpointId: z.string().trim().min(1),
        calls: z.number().int().min(1).optional(),
      }),
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const parsed = createJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid job creation", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const checkout = await createComputeJob({
      job: {
        jobId: parsed.data.jobId,
        wallet: parsed.data.wallet,
        requestKind: parsed.data.requestKind,
        requestedPrompt: parsed.data.requestedPrompt,
        subjectName: parsed.data.subjectName,
        subjectSymbol: parsed.data.subjectSymbol,
        subjectImage: parsed.data.subjectImage,
        subjectDescription: parsed.data.subjectDescription,
        packageType: parsed.data.packageType,
        rangeDays: parsed.data.rangeDays,
        priceSol: parsed.data.priceSol,
        videoSeconds: parsed.data.videoSeconds,
      },
      kind: parsed.data.kind,
      mint: parsed.data.mint,
      operations: parsed.data.operations as PayShOperation[] | undefined,
    });
    return NextResponse.json({ ok: true, checkout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Job creation failed", message }, { status: 400 });
  }
}
