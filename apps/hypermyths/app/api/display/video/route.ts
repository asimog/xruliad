import { createDisplayArtifact } from "@hypermyths/display";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(createDisplayArtifact({ productId: "hypermyths", kind: "video", surface: "hashmyth", permission: body.permission ?? "permissioned", routeMetadata: body }));
}
