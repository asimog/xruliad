import { hashMythVideoFromSimulation } from "@hypermyths/hashmyth-video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.simulationId || !body.simulationTitle) {
    return NextResponse.json({ error: "simulationId and simulationTitle required" }, { status: 400 });
  }
  const job = hashMythVideoFromSimulation({
    simulationId: body.simulationId,
    simulationTitle: body.simulationTitle
  });
  return NextResponse.json(job);
}
