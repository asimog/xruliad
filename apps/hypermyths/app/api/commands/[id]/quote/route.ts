import { quotePlatformAction } from "@hypermyths/platform-payments";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json({ commandId: context.params.id, quote: quotePlatformAction({ productId: "hypermyths", action: "premium_intelligence", estimatedCostUsd: 0 }) });
}
