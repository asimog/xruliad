import { prepareHashMythVideo } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const job = prepareHashMythVideo({
    title: body.title ?? "Generated Video",
    sourcePrompt: body.prompt ?? body.sourcePrompt ?? "",
    source: body.source ?? "prompt",
    inputPayload: body.inputPayload ?? body
  });
  return NextResponse.json(job);
}
