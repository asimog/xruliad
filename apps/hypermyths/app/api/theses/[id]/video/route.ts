import { prepareHashMythVideo } from "@hypermyths/hashmyth-video";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(prepareHashMythVideo({ title: `Thesis ${id}`, sourcePrompt: "Prepared thesis-to-video script.", source: "market_thesis" }));
}
