import { NextResponse } from "next/server";

export function GET(_: Request, context: { params: { id: string } }) {
  return NextResponse.json({ id: context.params.id, status: "prepared", note: "Display artifact persistence requires Supabase setup." });
}
