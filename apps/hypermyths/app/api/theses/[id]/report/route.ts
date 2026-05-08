import { NextResponse } from "next/server";

export function GET(_: Request, context: { params: { id: string } }) {
  return NextResponse.json({ thesisId: context.params.id, report: "Prepared thesis report; persistence requires Supabase setup." });
}
