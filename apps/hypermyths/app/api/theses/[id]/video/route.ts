import { prepareHashMythVideo } from "@hypermyths/hashmyth-video";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json(prepareHashMythVideo({ title: `Thesis ${context.params.id}`, sourcePrompt: "Prepared thesis-to-video script.", source: "market_thesis" }));
}
