import { hashMythVideoFromResearchReport } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.questId || !body.reportTitle) {
    return NextResponse.json({ error: "questId and reportTitle required" }, { status: 400 });
  }
  const job = hashMythVideoFromResearchReport({
    questId: body.questId,
    reportTitle: body.reportTitle
  });
  return NextResponse.json(job);
}
