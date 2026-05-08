import { quotePlatformAction } from "@hypermyths/platform-payments";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({ commandId: id, quote: quotePlatformAction({ productId: "hypermyths", action: "premium_intelligence", estimatedCostUsd: 0 }) });
}
