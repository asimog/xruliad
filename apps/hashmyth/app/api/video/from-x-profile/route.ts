import { hashMythVideoFromXProfile } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  const job = hashMythVideoFromXProfile({ handle: body.handle });
  return NextResponse.json(job);
}
