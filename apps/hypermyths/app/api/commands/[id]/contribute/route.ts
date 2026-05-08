import { contributeToCommand } from "@hypermyths/command-protocol";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(contributeToCommand({ commandId: id, contributor: body.contributor ?? "agent", kind: body.kind ?? "evidence", payload: body.payload ?? body }));
}
