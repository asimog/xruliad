import { createThesis, runThesis } from "@hypermyths/thesis-engine";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json(runThesis(createThesis({ productId: "polymyths", type: "market", title: context.params.id, claim: "Prepared thesis run", visibility: "public" })));
}
