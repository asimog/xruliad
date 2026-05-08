import { prepareAgentExecution } from "@hypermyths/product-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(prepareAgentExecution({ productId: "polymyths", toolId: body.toolId ?? "thesis.run", input: body.input ?? body }));
}
