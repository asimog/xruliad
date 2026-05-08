import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ status: "prepared", executableOnWeb: false, note: "HyperKaon can prepare simulation/compute tasks; trading execution is local-only." });
}
