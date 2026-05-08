import { prepareAgentExecution } from "@hypermyths/product-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(prepareAgentExecution({ productId: "hyperkaon", toolId: body.toolId ?? "simulation.prepare", input: body.input ?? body }));
}
