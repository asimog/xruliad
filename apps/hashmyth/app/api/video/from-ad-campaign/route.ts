import { hashMythVideoFromAdCampaign } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.campaignId || !body.campaignName) {
    return NextResponse.json({ error: "campaignId and campaignName required" }, { status: 400 });
  }
  const job = hashMythVideoFromAdCampaign({
    campaignId: body.campaignId,
    campaignName: body.campaignName
  });
  return NextResponse.json(job);
}
