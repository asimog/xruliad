import { createResearchQuest } from "@hypermyths/intelligence";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(createResearchQuest({ productId: "cancerhawk", title: `Research task for ${id}`, prompt: "Generate a careful research task with no clinical or treatment claims.", safetyNotes: ["No medical claims."] }));
}
