import { quotePlatformAction } from "@hypermyths/platform-payments";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(quotePlatformAction({ productId: "hypermyths", action: body.action ?? "premium_intelligence", estimatedCostUsd: Number(body.estimatedCostUsd ?? 0) }));
}
