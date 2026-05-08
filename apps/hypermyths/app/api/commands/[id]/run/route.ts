import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({ id: crypto.randomUUID(), commandId: id, status: "running", route: "cheapest_safe" });
}
