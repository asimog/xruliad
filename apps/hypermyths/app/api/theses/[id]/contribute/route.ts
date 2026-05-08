import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ id: crypto.randomUUID(), thesisId: context.params.id, contributor: body.contributor ?? "agent", payload: body.payload ?? body });
}
