import { prepareAdCampaign } from "@hypermyths/ads";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json(prepareAdCampaign({ thesisId: context.params.id, title: "Thesis ad concept", sponsor: "Transparent sponsor", concept: "Display thesis with visible payment metadata." }));
}
