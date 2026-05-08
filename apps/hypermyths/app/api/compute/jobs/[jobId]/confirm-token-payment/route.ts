import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { confirmTokenPayment } from "@/lib/pay/compute-intermediary";

export const runtime = "nodejs";

type Context = { params: Promise<{ jobId: string }> };

const confirmSchema = z.object({
  mint: z.string().trim().min(32).max(44),
  payerAddress: z.string().trim().min(32).max(44),
  signature: z.string().trim().min(1),
});

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;

  const parsed = confirmSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment confirmation", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await confirmTokenPayment({
      jobId,
      mint: parsed.data.mint,
      payerAddress: parsed.data.payerAddress,
      signature: parsed.data.signature,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") || message.includes("expired") ? 404 : 400;
    return NextResponse.json(
      { error: "Token payment confirmation failed", message },
      { status },
    );
  }
}
