import { prepareHashMythVideo } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const job = prepareHashMythVideo({
    title: body.title ?? "Untitled Video",
    sourcePrompt: body.sourcePrompt ?? body.prompt ?? "",
    source: body.source ?? "prompt",
    inputPayload: body.inputPayload ?? body
  });
  return NextResponse.json(job);
}

export function GET() {
  return NextResponse.json({ message: "POST to /api/jobs to create a video job" });
}
