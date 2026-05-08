import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({ id: crypto.randomUUID(), thesisId: id, status: "prepared", simulationEngine: "MiroShark boundary" });
}
