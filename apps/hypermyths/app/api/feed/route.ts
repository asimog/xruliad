import { NextRequest, NextResponse } from "next/server";
import { normalizeFeedItem, filterFeedItems, type FeedItem, type FeedFilter } from "@hypermyths/unified-feed";

const items: FeedItem[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter: FeedFilter = {};
  if (searchParams.get("productId")) filter.productId = searchParams.get("productId") as FeedFilter["productId"];
  if (searchParams.get("jobType")) filter.jobType = searchParams.get("jobType") as FeedFilter["jobType"];
  if (searchParams.get("status")) filter.status = searchParams.get("status") as FeedFilter["status"];
  if (searchParams.get("source")) filter.source = searchParams.get("source") as FeedFilter["source"];
  if (searchParams.get("limit")) filter.limit = Number(searchParams.get("limit"));
  if (searchParams.get("offset")) filter.offset = Number(searchParams.get("offset"));
  const filtered = filterFeedItems(items, filter);
  return NextResponse.json({ items: filtered, total: filtered.length, config: { enabled: true } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = normalizeFeedItem(body);
  items.unshift(item);
  return NextResponse.json(item, { status: 201 });
}
