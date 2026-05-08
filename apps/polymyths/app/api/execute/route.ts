import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ status: "local_only", executableOnWeb: false, note: "Polymyths can export local trade intents; web cannot execute." });
}
