import { displayCapabilities } from "@hypermyths/display";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(displayCapabilities());
}
