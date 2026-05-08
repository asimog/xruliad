import { hashMythVideoFromScript } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const job = hashMythVideoFromScript({
    title: body.title ?? "Untitled Video",
    script: body.script ?? body.prompt ?? ""
  });
  return NextResponse.json(job);
}
