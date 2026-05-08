import { createThesis, runThesis } from "@hypermyths/thesis-engine";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(runThesis(createThesis({ productId: "polymyths", type: "market", title: id, claim: "Prepared thesis run", visibility: "public" })));
}
