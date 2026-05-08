import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    status: "cancelled",
    message: `Job ${id} cancelled`,
    cancelledAt: new Date().toISOString()
  });
}
