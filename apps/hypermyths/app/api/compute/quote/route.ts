import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { quoteComputeWork } from "@/lib/pay/compute-intermediary";
import type { PayShOperation } from "@/lib/pay/intermediary";

export const runtime = "nodejs";

const quoteSchema = z.object({
  jobId: z.string().trim().min(1),
  kind: z.enum(["image_generation", "video_generation", "inference"]),
  mint: z.string().trim().min(32).max(44),
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
  const parsed = quoteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const inputDigest = `pump:${parsed.data.jobId}:${parsed.data.kind}:${parsed.data.mint}`;
    const quote = await quoteComputeWork({
      jobId: parsed.data.jobId,
      kind: parsed.data.kind,
      mint: parsed.data.mint,
      operations: parsed.data.operations as PayShOperation[] | undefined,
      inputDigest,
    });
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Quoting failed", message }, { status: 400 });
  }
}
