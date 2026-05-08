import { NextResponse } from "next/server";
import { createEventEnvelope } from "@hypermyths/feed-events";
import { normalizeFeedItem } from "@hypermyths/unified-feed";

export async function GET() {
  return NextResponse.json({ name: "HyperMyths Unified Feed — Global", version: "v1", endpoints: ["/api/feed", "/api/feed/global", "/api/feed/product/:id", "/api/feed/:id"] });
}
