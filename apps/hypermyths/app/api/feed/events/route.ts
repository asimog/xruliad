import { NextRequest, NextResponse } from "next/server";
import { createFeedEvent } from "@hypermyths/unified-feed";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const event = createFeedEvent({ feed_item_id: body.feed_item_id ?? "unknown", event_type: body.event_type ?? "status_change", safe_message: body.safe_message ?? "Event created", status: body.status });
  return NextResponse.json(event, { status: 201 });
}
