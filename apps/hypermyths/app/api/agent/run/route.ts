import { runAgentRoute } from "@hypermyths/agent-router";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(runAgentRoute({ productId: "hypermyths", toolId: body.toolId ?? "agent.run", input: body.input ?? body }));
}
