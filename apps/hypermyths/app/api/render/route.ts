// Internal render endpoint — receives render requests from lib/video/client.ts
// and dispatches to xAI /videos/generations. Returns async { id, jobId }
// so the client can poll GET /api/render/:id for completion.

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import { secureCompare } from "@/lib/security/crypto";
import {
  enforceAudioStyleConstraint,
  enforceNoTextVideoConstraint,
} from "@/lib/video/prompt-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

export async function POST(request: NextRequest) {
  const env = getEnv();
  if (!env.VIDEO_API_KEY) {
    return NextResponse.json(
      { error: "VIDEO_API_KEY not configured" },
      { status: 503 },
    );
  }
  const token = extractBearer(
    request.headers.get("authorization") ?? undefined,
  );
  if (!token || !secureCompare(token, env.VIDEO_API_KEY)) {
    return unauthorized();
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract xAI-specific payload (sent by lib/video/client.ts)
  const xai = body.xai as Record<string, unknown> | undefined;
  const prompt = enforceAudioStyleConstraint(
    enforceNoTextVideoConstraint((xai?.prompt ?? body.prompt ?? "") as string),
  );
  const model = (xai?.model ??
    body.model ??
    env.XAI_VIDEO_MODEL ??
    "grok-imagine-video") as string;
  const durationSeconds = (body.durationSeconds as number | undefined) ?? 10;
  const jobId = (body.jobId as string | undefined) ?? "";

  // First scene image (optional)
  const scenes = xai?.sceneMetadata as
    | Array<{ imageUrl?: string | null }>
    | undefined;
  const imageUrl = scenes?.[0]?.imageUrl ?? null;

  const apiKey = env.XAI_VIDEO_API_KEY ?? env.XAI_API_KEY;
  const xaiBase = (env.XAI_VIDEO_BASE_URL ?? env.XAI_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY not configured" },
      { status: 503 },
    );
  }

  // xAI valid sizes: 848x480, 1696x960, 1280x720, 1920x1080
  const xaiBody: Record<string, unknown> = {
    model,
    prompt,
    size: "1280x720",
    duration_seconds: Math.max(3, Math.min(15, Math.floor(durationSeconds))),
  };
  if (imageUrl) {
    xaiBody.image_url = imageUrl;
  }

  const startResp = await fetchWithTimeout(
    `${xaiBase}/videos/generations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(xaiBody),
    },
    45_000, // 45s timeout for xAI video generation start
  );

  const startText = await startResp.text();
  if (!startResp.ok) {
    return NextResponse.json(
      {
        error: `xAI video start failed (${startResp.status})`,
        details: startText,
      },
      { status: startResp.status },
    );
  }

  let started: Record<string, unknown>;
  try {
    started = JSON.parse(startText);
  } catch {
    return NextResponse.json(
      { error: "xAI returned invalid JSON", raw: startText },
      { status: 502 },
    );
  }

  // If xAI returned a video URL immediately (sync response), return it now
  const immediateUrl = (started.video_url ?? started.videoUrl) as
    | string
    | undefined;
  if (immediateUrl) {
    return NextResponse.json({
      id: (started.id ?? started.request_id ?? "immediate") as string,
      jobId,
      mode: "sync",
      videoUrl: immediateUrl,
      thumbnailUrl: null,
    });
  }

  // Async — return request ID so caller can poll /api/render/:id
  const requestId = (
    (started.request_id ?? started.id) as string | undefined
  )?.trim();
  if (!requestId) {
    return NextResponse.json(
      { error: "xAI did not return a request id", raw: startText },
      { status: 502 },
    );
  }

  return NextResponse.json({
    id: requestId,
    jobId,
    mode: "async",
    statusUrl: `${env.APP_BASE_URL}/api/render/${encodeURIComponent(requestId)}`,
  });
}
