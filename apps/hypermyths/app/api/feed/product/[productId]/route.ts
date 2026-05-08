import { NextResponse } from "next/server";
import { normalizeFeedItem } from "@hypermyths/unified-feed";
import type { ProductId } from "@hypermyths/theme";

export async function GET(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const example = normalizeFeedItem({ source_product: productId as ProductId | "hashmyth" | "platform", job_type: "intelligence", title: `${productId} feed example`, status: "complete", runtime_mode: "web", privacy_tier: "public" });
  return NextResponse.json({ productId, items: [example], total: 1 });
}
