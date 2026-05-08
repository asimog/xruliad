import { createThesis, exportLocalTradeIntent } from "@hypermyths/thesis-engine";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json(exportLocalTradeIntent(createThesis({ productId: "polymyths", type: "market", title: context.params.id, claim: "Prepared local-only trading intent.", visibility: "private" })));
}
