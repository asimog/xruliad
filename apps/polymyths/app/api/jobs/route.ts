import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ id: crypto.randomUUID(), productId: "polymyths", status: "prepared", input: body });
}
