import { createDisplayArtifact } from "@hypermyths/display";
import { NextResponse } from "next/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(createDisplayArtifact({ productId: "hypermyths", kind: "thesis", surface: "terminal", permission: "permissioned", routeMetadata: { commandId: id } }));
}
