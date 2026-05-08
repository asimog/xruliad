import { createCommand, exportCommandLocalIntent } from "@hypermyths/command-protocol";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const command = createCommand({ productId: "hypermyths", type: "market_thesis", title: id, prompt: "", permission: "local_only" });
  return NextResponse.json(exportCommandLocalIntent({ ...command, id }));
}
