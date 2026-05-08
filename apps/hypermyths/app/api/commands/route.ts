import { createCommand } from "@hypermyths/command-protocol";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(createCommand({ productId: "hypermyths", type: body.type ?? "market_thesis", title: body.title ?? "Untitled command", prompt: body.prompt ?? "", permission: body.permission ?? "public" }));
}
