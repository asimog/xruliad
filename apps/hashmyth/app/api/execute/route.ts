import { prepareAgentExecution } from "@hypermyths/product-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = prepareAgentExecution({
    productId: "hashmyth",
    toolId: body.toolId ?? "execute.prepare",
    input: body.input ?? body
  });
  return NextResponse.json(result);
}
