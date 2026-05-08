import { hashMythVideoFromToken } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.tokenAddress) {
    return NextResponse.json({ error: "tokenAddress required" }, { status: 400 });
  }
  const job = hashMythVideoFromToken({
    tokenAddress: body.tokenAddress,
    network: body.network ?? "solana"
  });
  return NextResponse.json(job);
}
