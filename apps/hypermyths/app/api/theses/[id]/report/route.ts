import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({ thesisId: id, report: "Prepared thesis report; persistence requires Supabase setup." });
}
