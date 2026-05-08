import { NextResponse } from "next/server";
import { normalizeFeedItem } from "@hypermyths/unified-feed";

export async function GET(_: Request, { params }: { params: Promise<{ commandId: string }> }) {
  const { commandId } = await params;
  const item = normalizeFeedItem({ source_product: "hypermyths", job_type: "command", title: `Command ${commandId}`, status: "running", runtime_mode: "web", privacy_tier: "public", command_id: commandId });
  return NextResponse.json({ commandId, items: [item], total: 1 });
}
