import { NextResponse } from "next/server";
import { normalizeFeedItem } from "@hypermyths/unified-feed";

export async function GET(_: Request, { params }: { params: Promise<{ thesisId: string }> }) {
  const { thesisId } = await params;
  const item = normalizeFeedItem({ source_product: "polymyths", job_type: "thesis", title: `Thesis ${thesisId}`, status: "prepared", runtime_mode: "web", privacy_tier: "public", thesis_id: thesisId });
  return NextResponse.json({ thesisId, items: [item], total: 1 });
}
