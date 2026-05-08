import { NextRequest, NextResponse } from "next/server";
import { createFeedSyncItem } from "@hypermyths/unified-feed";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = createFeedSyncItem({ local_feed_id: body.local_feed_id ?? "unknown", direction: body.direction ?? "local_to_cloud" });
  return NextResponse.json(item, { status: 201 });
}
