import { createDisplayArtifact } from "@hypermyths/display";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(createDisplayArtifact({ productId: "hypertian", kind: "ad", surface: "hypertian_overlay", permission: body.permission ?? "permissioned", sponsorMetadataVisible: true, routeMetadata: body }));
}
