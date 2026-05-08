import { hashMythVideoFromMarketThesis } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.thesisId || !body.thesisTitle) {
    return NextResponse.json({ error: "thesisId and thesisTitle required" }, { status: 400 });
  }
  const job = hashMythVideoFromMarketThesis({
    thesisId: body.thesisId,
    thesisTitle: body.thesisTitle
  });
  return NextResponse.json(job);
}
