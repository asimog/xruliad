import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { spendComputeJob } from "@/lib/pay/compute-intermediary";
import type { PayShEndpointId } from "@/lib/pay/catalog";

export const runtime = "nodejs";

type Context = { params: Promise<{ jobId: string }> };

const runSchema = z.object({
  endpointId: z.string().trim().min(1),
  body: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;

  const parsed = runSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid run request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await spendComputeJob({
      jobId,
      endpointId: parsed.data.endpointId as PayShEndpointId,
      body: parsed.data.body as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Cannot spend") || message.includes("balance too low") ? 402 : 400;
    return NextResponse.json({ error: "Compute spend failed", message }, { status });
  }
}
