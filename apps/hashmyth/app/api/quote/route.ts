import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    id: crypto.randomUUID(),
    productId: "hashmyth",
    paymentPlane: "platform",
    action: body.action ?? "video_generation",
    estimatedCostUsd: body.estimatedCostUsd ?? 0,
    currency: "USDC",
    publicReceipt: true,
    costBreakdown: [{ label: body.action ?? "video_generation", amountUsd: body.estimatedCostUsd ?? 0 }],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  });
}
