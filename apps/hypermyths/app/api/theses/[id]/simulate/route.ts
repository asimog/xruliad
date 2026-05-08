import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json({ id: crypto.randomUUID(), thesisId: context.params.id, status: "prepared", simulationEngine: "MiroShark boundary" });
}
