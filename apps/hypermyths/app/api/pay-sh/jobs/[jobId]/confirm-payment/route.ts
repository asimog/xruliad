import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { confirmPayShPayment } from "@/lib/pay/intermediary";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ jobId: string }>;
};

const confirmSchema = z.object({
  rail: z.enum(["solana_sol", "x402_usdc"]),
  payerAddress: z.string().trim().min(1),
  signature: z.string().trim().min(1).optional(),
  x402Transaction: z.string().trim().min(1).optional(),
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
    const checkout = await confirmPayShPayment({
      jobId,
      rail: parsed.data.rail,
      payerAddress: parsed.data.payerAddress,
      signature: parsed.data.signature,
      x402Transaction: parsed.data.x402Transaction,
    });
    return NextResponse.json({
      ok: true,
      status: "payment_confirmed",
      jobId,
      checkout,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Payment confirmation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
