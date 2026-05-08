import { createDisplayArtifact } from "@hypermyths/display";
import { NextResponse } from "next/server";

export function POST(_: Request, context: { params: { id: string } }) {
  return NextResponse.json(createDisplayArtifact({ productId: "hypermyths", kind: "thesis", surface: "terminal", permission: "permissioned", routeMetadata: { commandId: context.params.id } }));
}
