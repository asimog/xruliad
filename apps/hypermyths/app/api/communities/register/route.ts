import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { registerCommunity } from "@/lib/pay/compute-intermediary";

export const runtime = "nodejs";

const registerSchema = z.object({
  mint: z.string().trim().min(32).max(44),
  name: z.string().trim().min(1).max(100),
  symbol: z.string().trim().min(1).max(20),
  image: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  metadataUri: z.string().url().optional(),
  socials: z
    .object({
      twitter: z.string().url().optional(),
      telegram: z.string().url().optional(),
      website: z.string().url().optional(),
      discord: z.string().url().optional(),
    })
    .optional(),
  publicAddress: z.string().trim().min(32).max(44),
  acceptedJobTypes: z.array(z.enum(["image_generation", "video_generation", "inference"])).min(1),
});

export async function POST(request: NextRequest) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid community registration", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await registerCommunity(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("already registered") ? 409 : 400;
    return NextResponse.json({ error: "Registration failed", message }, { status });
  }
}
