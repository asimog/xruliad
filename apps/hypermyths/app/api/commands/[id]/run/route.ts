import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json({ id: crypto.randomUUID(), commandId: context.params.id, status: "running", route: "cheapest_safe" });
}
