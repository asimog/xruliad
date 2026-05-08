import { createExecutionIntent } from "@hypermyths/local-trading";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const intent = createExecutionIntent({
    commandId: body.commandId,
    thesisId: body.thesisId,
    venue: "paper",
    asset: body.asset ?? "UNSPECIFIED",
    side: body.side ?? "simulate",
    quantity: body.quantity,
    notional: body.notional,
    rationale: body.rationale ?? "Prepared by web terminal. Local execution gateway required."
  });
  return NextResponse.json({ status: "local_only", executableOnWeb: false, requiresLocalExecutionGateway: true, intent });
}
