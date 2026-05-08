import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ status: "prepared", executableOnWeb: false, note: "Hypertian can prepare campaign/display jobs; trading execution is local-only." });
}
