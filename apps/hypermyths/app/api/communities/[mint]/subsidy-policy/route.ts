import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { setSubsidyPolicy } from "@/lib/pay/compute-intermediary";

export const runtime = "nodejs";

type Context = { params: Promise<{ mint: string }> };

const policySchema = z.object({
  subsidyRateBps: z.number().int().min(0).max(10000),
  minimumWalletUsd: z.number().min(0).optional(),
  maxSubsidyPerJob: z.number().min(0).optional(),
});

export async function POST(request: NextRequest, context: Context) {
  const { mint } = await context.params;

  const parsed = policySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subsidy policy", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await setSubsidyPolicy({ mint, ...parsed.data });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: "Subsidy policy update failed", message }, { status });
  }
}
