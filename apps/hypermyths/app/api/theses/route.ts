import { createThesis } from "@hypermyths/thesis-engine";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(createThesis({ productId: body.productId ?? "polymyths", type: body.type ?? "market", title: body.title ?? "Untitled thesis", claim: body.claim ?? body.prompt ?? "", visibility: body.visibility ?? "public" }));
}
