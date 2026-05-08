import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    source: "token",
    status: "prepared",
    script: {
      title: "Example Video",
      narration: "Sample narration",
      captions: ["Sample caption"],
      scenes: [{ index: 0, description: "Opening scene", visualPrompt: "cinematic", narration: "Hello", durationSeconds: 5, shotType: "wide" }],
      visualPrompts: ["cinematic"],
      durationEstimateSeconds: 5
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
