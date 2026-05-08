import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ id: crypto.randomUUID(), thesisId: id, contributor: body.contributor ?? "agent", payload: body.payload ?? body });
}
