import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateTextInferenceJson } from "@/lib/inference/text";
import {
  buildComposer,
  buildModeOptions,
  buildModePrompt,
  getDefaultMythXMode,
  getMythXModeConfig,
  getMythXModesForPrompt,
  isModeAvailable,
  isSelectableMythXMode,
  mythXActionTypeSchema,
  mythXModeSchema,
  type MythXMode,
} from "@/lib/chat/mythx";
import {
  getOptionalPrivySession,
  getPrivySessionUserId,
} from "@/lib/auth/privy-server";
import { logger } from "@/lib/logging/logger";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";

export const runtime = "nodejs";

const RATE_LIMIT_RULES = [
  { name: "mythx_chat_per_minute", windowSec: 60, limit: 16 },
  { name: "mythx_chat_per_hour", windowSec: 3_600, limit: 100 },
] as const;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const payloadSchema = z.object({
  messages: z.array(messageSchema).max(24).default([]),
  mode: mythXModeSchema.optional(),
  selection: z.string().trim().min(1).max(64).optional(),
});

const modelResponseSchema = z.object({
  message: z.string().trim().min(1).max(220),
  mode: mythXModeSchema,
  action: z.object({
    type: mythXActionTypeSchema,
    value: z.string().trim().max(1_000).optional(),
    notes: z.string().trim().max(600).optional(),
  }),
});

function initialResponse(isAuthenticated: boolean) {
  const mode = getDefaultMythXMode(isAuthenticated);
  return {
    message:
      "Paste a token address. Hermes will scan it with Helius, DexScreener, Birdeye, GMGN, and XActions.",
    mode,
    options: buildModeOptions(isAuthenticated),
    composer: buildComposer(mode, isAuthenticated),
    action: { type: "show_options" as const },
  };
}

function buildSelectionResponse(selection: string, isAuthenticated: boolean) {
  if (selection === "back_to_menu") {
    return initialResponse(isAuthenticated);
  }

  if (selection === "login_required" && !isAuthenticated) {
    return {
      message: "No login is needed for token scanning.",
      mode: "token_scanner" as const,
      options: buildModeOptions(isAuthenticated),
      composer: buildComposer("token_scanner", isAuthenticated),
      action: { type: "collect_input" as const },
    };
  }

  if (isSelectableMythXMode(selection) && isModeAvailable(selection, isAuthenticated)) {
    return {
      message: buildModePrompt(selection, isAuthenticated),
      mode: selection,
      options: buildModeOptions(isAuthenticated),
      composer: buildComposer(selection, isAuthenticated),
      action: { type: "collect_input" as const },
    };
  }

  return initialResponse(isAuthenticated);
}

function buildSystemPrompt(input: {
  isAuthenticated: boolean;
  currentMode: MythXMode;
}) {
  const modes = getMythXModesForPrompt(input.isAuthenticated)
    .map(
      (mode) =>
        `- ${mode.id}: ${mode.label}. ${mode.description}${mode.authOnly ? " (login required)" : ""}`,
    )
    .join("\n");

  return [
    "You are Hermes, a compact token scanner routing assistant.",
    "Keep responses short, crisp, and action-oriented. Do not roleplay. Do not explain the whole product.",
    "You are not a general chatbot. Your job is to steer users into token scanning or trending-token views.",
    `Authenticated user: ${input.isAuthenticated ? "yes" : "no"}.`,
    `Current mode: ${input.currentMode}.`,
    "Allowed modes:",
    modes,
    "Rules:",
    "- token_scanner is for token research only.",
    "- trending_tokens shows market trends only.",
    "- Never mention old media-generation language or creator modes.",
    "- If the user provides a token address, return mode=token_scanner and action.type=collect_input with the cleaned address in action.value.",
    "- If the user has picked a mode but the input is missing or unclear, return action.type=collect_input.",
    "- If the user asks for market lists, return mode=trending_tokens and action.type=select_mode.",
    "- If the user is off-topic, redirect them back to token scanning with action.type=show_options.",
    "Return JSON only with this shape:",
    '{"message":"short text","mode":"token_scanner|trending_tokens|login_required","action":{"type":"show_options|select_mode|collect_input|suggest_login","value":"optional cleaned token address","notes":"optional note"}}',
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_chat_stream",
      key: ip,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }

    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload.",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const session = await getOptionalPrivySession(request);
    const isAuthenticated = Boolean(session);

    if (parsed.data.selection) {
      return NextResponse.json(buildSelectionResponse(parsed.data.selection, isAuthenticated));
    }

    const messages = parsed.data.messages;
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (!latestUserMessage) {
      return NextResponse.json(initialResponse(isAuthenticated));
    }

    const requestedMode =
      parsed.data.mode && isModeAvailable(parsed.data.mode, isAuthenticated)
        ? parsed.data.mode
        : getDefaultMythXMode(isAuthenticated);

    const response = await generateTextInferenceJson<z.infer<typeof modelResponseSchema>>({
      temperature: 0.15,
      maxTokens: 320,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt({
            isAuthenticated,
            currentMode: requestedMode,
          }),
        },
        ...messages
          .filter((message) => message.role === "user")
          .map((message) => ({
            role: "user" as const,
            content: message.content,
          })),
      ],
    });

    const parsedResponse = modelResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      return NextResponse.json(initialResponse(isAuthenticated));
    }

    let mode = parsedResponse.data.mode;
    let action = parsedResponse.data.action;
    let message = parsedResponse.data.message;

    if (!isModeAvailable(mode, isAuthenticated)) {
      mode = "token_scanner";
      action = { type: "collect_input" };
      message = "Paste a token address to scan.";
    }

    const normalizedMode =
      mode === "login_required" && isAuthenticated ? getDefaultMythXMode(true) : mode;

    return NextResponse.json({
      message,
      mode: normalizedMode,
      options: buildModeOptions(isAuthenticated),
      composer: buildComposer(normalizedMode, isAuthenticated),
      action,
      auth: {
        authenticated: isAuthenticated,
        userId: session ? getPrivySessionUserId(session) : null,
      },
      hints: {
        activeModeLabel: getMythXModeConfig(normalizedMode).label,
      },
    });
  } catch (error) {
    logger.error("mythx_chat_failed", {
      component: "api_chat_stream",
      stage: "post",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "MythX chat failed.",
      },
      { status: 500 },
    );
  }
}
