import { productCapabilities } from "@hypermyths/product-api";
import { runtimeStatus } from "@hypermyths/runtime";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ...productCapabilities("hypermyths"), runtime: runtimeStatus() });
}
