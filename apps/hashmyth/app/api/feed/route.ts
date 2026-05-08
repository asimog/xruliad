import { normalizeFeedItem, productToFeedJobTypes } from "@hypermyths/unified-feed";
import { NextResponse } from "next/server";

export function GET() {
  const types = productToFeedJobTypes.hashmyth ?? [];
  const items = types.map((t) => normalizeFeedItem({ source_product: "hashmyth", job_type: t, title: `HashMyth ${t} feed item`, status: "complete", runtime_mode: "web", privacy_tier: "public" }));
  return NextResponse.json({ product: "hashmyth", jobTypes: types, items, count: items.length });
}
