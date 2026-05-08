import { NextResponse } from "next/server";

export function GET(_: Request, context: { params: { id: string } }) {
  return NextResponse.json({ commandId: context.params.id, contributions: [] });
}
