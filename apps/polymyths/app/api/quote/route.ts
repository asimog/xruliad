import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ productId: "polymyths", paymentPlane: "platform", requiresQuote: true, estimatedCostUsd: 0 });
}
