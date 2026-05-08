import { prepareAdCampaign } from "@hypermyths/ads";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(prepareAdCampaign({ thesisId: id, title: "Thesis ad concept", sponsor: "Transparent sponsor", concept: "Display thesis with visible payment metadata." }));
}
