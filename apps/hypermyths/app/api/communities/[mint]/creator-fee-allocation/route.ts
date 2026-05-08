import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { allocateCreatorFees } from "@/lib/pay/compute-intermediary";

export const runtime = "nodejs";

type Context = { params: Promise<{ mint: string }> };

const allocationSchema = z.object({
  amountUsd: z.number().positive(),
  depositTxHash: z.string().trim().min(1).optional(),
  allocatedBy: z.enum(["admin", "creator_fee", "system"]).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, context: Context) {
  const { mint } = await context.params;

  const parsed = allocationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid allocation", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await allocateCreatorFees({ mint, ...parsed.data });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: "Allocation failed", message }, { status });
  }
}
