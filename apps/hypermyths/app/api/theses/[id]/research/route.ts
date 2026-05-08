import { createResearchQuest } from "@hypermyths/intelligence";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json(createResearchQuest({ productId: "cancerhawk", title: `Research task for ${context.params.id}`, prompt: "Generate a careful research task with no clinical or treatment claims.", safetyNotes: ["No medical claims."] }));
}
