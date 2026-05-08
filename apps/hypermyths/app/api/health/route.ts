import { productHealth } from "@hypermyths/product-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(productHealth("hypermyths"));
}
