// Group chat: in-memory SSE broadcast + POST to send messages
// Messages are ephemeral (in-memory). For persistence, attach a DB table.
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { secureCompare } from "@/lib/security/crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
  role: "user" | "agent";
}

// Shared in-memory state (per worker instance — acceptable for Railway single-instance)
const messages: ChatMessage[] = [];
const subscribers = new Set<(msg: ChatMessage) => void>();
const MAX_HISTORY = 100;
const MAX_SUBSCRIBERS = 200;
const SSE_HEARTBEAT_MS = 15_000;

const GET_RATE_LIMIT_RULES = [
  { name: "autonomous_chat_get_per_minute", windowSec: 60, limit: 30 },
  { name: "autonomous_chat_get_per_hour", windowSec: 3_600, limit: 240 },
] as const;

const POST_RATE_LIMIT_RULES = [
  { name: "autonomous_chat_post_per_minute", windowSec: 60, limit: 20 },
  { name: "autonomous_chat_post_per_hour", windowSec: 3_600, limit: 300 },
] as const;

const messagePayloadSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
  sender: z.string().trim().min(1).max(64).default("anonymous"),
});

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function broadcast(msg: ChatMessage) {
  for (const fn of subscribers) {
    try {
      fn(msg);
    } catch {
      subscribers.delete(fn);
    }
  }
}

function getChatToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const queryToken = new URL(request.url).searchParams.get("token");
  return queryToken?.trim() || null;
}

function isAuthorized(request: NextRequest): boolean {
  const configuredToken = process.env.AUTONOMOUS_CHAT_TOKEN?.trim();
  if (!configuredToken) {
    return true;
  }
  const token = getChatToken(request);
  return Boolean(token && secureCompare(token, configuredToken));
}

// GET — SSE stream of group chat messages
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = getRequestIp(request);
  const rateLimit = await enforceRateLimit({
    scope: "api_autonomous_chat_get",
    key: ip,
    rules: [...GET_RATE_LIMIT_RULES],
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSec: rateLimit.retryAfterSec },
      { status: 429 },
    );
  }

  if (subscribers.size >= MAX_SUBSCRIBERS) {
    return NextResponse.json(
      { error: "Too many active subscribers" },
      { status: 503 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let handlerRef: ((msg: ChatMessage) => void) | null = null;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          cleanup();
        }
      };

      const heartbeat = setInterval(() => {
        if (!closed) {
          send({ type: "heartbeat", ts: Date.now() });
        }
      }, SSE_HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (handlerRef) subscribers.delete(handlerRef);
        try {
          controller.close();
        } catch {}
      };

      request.signal.addEventListener("abort", cleanup, { once: true });

      // Send last N messages as history on connect
      send({ type: "history", messages: messages.slice(-50) });

      // Subscribe to new messages
      const handler = (msg: ChatMessage) =>
        send({ type: "message", message: msg });
      handlerRef = handler;
      subscribers.add(handler);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// POST — send a message to the group chat
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_autonomous_chat_post",
      key: ip,
      rules: [...POST_RATE_LIMIT_RULES],
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: rateLimit.retryAfterSec },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsedBody = messagePayloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "invalid payload", details: parsedBody.error.issues },
        { status: 400 },
      );
    }
    const { text, sender } = parsedBody.data;

    const msg: ChatMessage = {
      id: uid(),
      sender,
      text,
      ts: Date.now(),
      role: "user",
    };

    messages.push(msg);
    if (messages.length > MAX_HISTORY)
      messages.splice(0, messages.length - MAX_HISTORY);
    broadcast(msg);

    return NextResponse.json({ ok: true, message: msg });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
