import { hashMythVideoFromWallet } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.walletAddress) {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }
  const job = hashMythVideoFromWallet({
    walletAddress: body.walletAddress,
    network: body.network ?? "solana"
  });
  return NextResponse.json(job);
}
