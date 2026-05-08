import { createCommand, exportCommandLocalIntent } from "@hypermyths/command-protocol";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  const command = createCommand({ productId: "hypermyths", type: "market_thesis", title: context.params.id, prompt: "", permission: "local_only" });
  return NextResponse.json(exportCommandLocalIntent({ ...command, id: context.params.id }));
}
