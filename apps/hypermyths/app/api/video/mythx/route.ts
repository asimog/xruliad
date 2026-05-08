import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPromptVideoJob } from "@/lib/jobs/repository";
import { triggerJobProcessingSoft } from "@/lib/jobs/trigger-soft";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { fetchXProfileTweets, normalizeXProfileInput } from "@/lib/x/api";
import { logger } from "@/lib/logging/logger";
import { getSingleClipVideoSeconds } from "@/lib/video/simple-prompt";
import { X_PROFILE_TWEET_LIMIT } from "@/lib/x/constants";
import type { XTweet } from "@/lib/x/api";

export const runtime = "nodejs";
export const maxDuration = 300;

function withDeprecatedHeaders(response: NextResponse): NextResponse {
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", "2026-06-30");
  response.headers.set(
    "Link",
    '</api/video/create>; rel="successor-version"',
  );
  response.headers.set(
    "Warning",
    '299 - "Deprecated route. Use /api/video/create with inputType=x_profile and pipeline=hypermyths_generic_engine."',
  );
  return response;
}

const mythxSchema = z.object({
  profileInput: z.string().min(1, "X username or profile URL is required"),
});

const RATE_LIMIT_RULES = [
  { name: "mythx_per_handle_per_day", windowSec: 86_400, limit: 2 },
] as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "your",
  "just",
  "about",
  "into",
  "they",
  "them",
  "their",
  "there",
  "what",
  "when",
  "where",
  "while",
  "will",
  "been",
  "were",
  "than",
  "then",
  "more",
  "less",
  "over",
  "under",
  "after",
  "before",
  "because",
  "would",
  "could",
  "should",
  "cant",
  "dont",
  "im",
  "youre",
  "its",
  "our",
  "out",
  "all",
  "are",
  "is",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "we",
  "i",
  "it",
]);

function compactLine(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1).trimEnd()}…`;
}

function topRecurring(entries: string[], max = 4): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry) continue;
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]))
    .slice(0, max)
    .map(([value, count]) => (count > 1 ? `${value} x${count}` : value));
}

function extractTopics(tweets: XTweet[], max = 5): string[] {
  const tagMatches = tweets.flatMap((tweet) =>
    [...tweet.text.matchAll(/#([a-zA-Z0-9_]+)/g)].map((match) =>
      match[1].toLowerCase(),
    ),
  );
  const words = tweets.flatMap((tweet) =>
    tweet.text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9_#@ ]+/g, " ")
      .split(/\s+/)
      .map((token) => token.replace(/^#+/, "").trim())
      .filter(
        (token) =>
          token.length >= 4 &&
          !token.startsWith("@") &&
          !STOP_WORDS.has(token),
      ),
  );

  return topRecurring([...tagMatches, ...words], max);
}

function detectTensions(tweets: XTweet[]): string[] {
  const all = tweets.map((tweet) => tweet.text.toLowerCase()).join(" \n ");
  const cues: string[] = [];

  if (
    /(bull|pump|up only|moon|so back|send it|green)/.test(all) &&
    /(dump|rug|down|rekt|crash|fear|blood)/.test(all)
  ) {
    cues.push("Oscillates between euphoria and collapse language.");
  }
  if (
    /(build|ship|long-term|conviction|thesis)/.test(all) &&
    /(quick flip|flip|exit|scalp|short-term|farm)/.test(all)
  ) {
    cues.push("Tension between conviction-posting and short-term opportunism.");
  }
  if (
    /(calm|patient|discipline|focus|plan)/.test(all) &&
    /(chaos|panic|fomo|revenge|unhinged)/.test(all)
  ) {
    cues.push("Voice alternates between disciplined strategist and chaos reactor.");
  }

  return cues.slice(0, 3);
}

function buildMythXRequestedPrompt(input: {
  username: string;
  tweets: XTweet[];
}): string {
  const handles = topRecurring(
    input.tweets.flatMap((tweet) =>
      [...tweet.text.matchAll(/@([a-zA-Z0-9_]{1,15})/g)].map(
        (match) => `@${match[1]}`,
      ),
    ),
    4,
  );
  const topics = extractTopics(input.tweets, 5);
  const tensions = detectTensions(input.tweets);
  const scopedTweets = input.tweets.slice(0, X_PROFILE_TWEET_LIMIT);
  const beatSeeds = [
    scopedTweets[0]?.text,
    scopedTweets[Math.floor(scopedTweets.length / 3)]?.text,
    scopedTweets[Math.floor((scopedTweets.length * 2) / 3)]?.text,
    scopedTweets[scopedTweets.length - 1]?.text,
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);

  const beats = beatSeeds.map(
    (line, index) => `Beat ${index + 1}: ${compactLine(line, 180)}`,
  );

  return [
    `MythX Subject: @${input.username}`,
    `Evidence scope: exactly ${Math.min(X_PROFILE_TWEET_LIMIT, scopedTweets.length)} recent tweets (numbered transcript).`,
    `Recurring handles/topics: ${(handles.length ? handles : ["none"]).join(", ")} | ${(topics.length ? topics : ["none"]).join(", ")}.`,
    `Contradiction/tension cues: ${(tensions.length ? tensions : ["Find friction between stated identity and behavior across tweets."]).join(" | ")}`,
    "Scene guidance beats:",
    ...(beats.length
      ? beats
      : [
          "Beat 1: Establish the public persona from the opening tweet evidence.",
          "Beat 2: Escalate through conflicting signals in mid-timeline tweets.",
          "Beat 3: Land on the mythic identity suggested by the final tweet.",
        ]),
    "Direction: Build an internet-biography arc using tweet evidence; avoid generic motivational filler and avoid tweet-by-tweet recap.",
  ].join("\n");
}

function shouldDeferMythXLookup(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("authentication failed") ||
    message.includes("rate limit reached") ||
    message.includes("temporarily unavailable")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = mythxSchema.safeParse(body);

    if (!validation.success) {
      return withDeprecatedHeaders(NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      ));
    }

    const { profileInput } = validation.data;
    const normalized = normalizeXProfileInput(profileInput);

    if (!normalized.username) {
      return withDeprecatedHeaders(NextResponse.json(
        { error: "Invalid X profile handle or URL" },
        { status: 400 },
      ));
    }

    // Rate limit per X handle (not IP)
    const handleKey = `xhandle:${normalized.username.toLowerCase()}`;
    const rateLimit = await enforceRateLimit({
      scope: "api_video_mythx",
      key: handleKey,
      rules: [...RATE_LIMIT_RULES],
    });

    if (!rateLimit.allowed) {
      return withDeprecatedHeaders(NextResponse.json(
        {
          error: "Rate limit exceeded. This X handle has reached its daily limit.",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      ));
    }

    let subjectName = normalized.username
      ? `@${normalized.username}`
      : "X profile";
    let sourceMediaUrl = normalized.profileUrl ?? profileInput;
    let sourceTranscript: string | undefined;
    let requestedPrompt = [
      `MythX Subject: @${normalized.username}`,
      `Evidence scope: up to ${X_PROFILE_TWEET_LIMIT} recent tweets once profile hydration completes.`,
      "Recurring handles/topics: unknown until fetch; infer from transcript when available.",
      "Contradiction/tension cues: identify where persona, tone, or claims conflict across tweets.",
      "Scene guidance beats:",
      "Beat 1: Establish the current online persona.",
      "Beat 2: Escalate via contradictions and recurring obsessions.",
      "Beat 3: Resolve on the projected myth, not a timeline recap.",
      "Direction: Build an internet-biography arc using tweet evidence and avoid generic filler.",
    ].join("\n");
    let subjectDescription =
      `Biography-first MythX short about @${normalized.username}. ` +
      `Built from the last ${X_PROFILE_TWEET_LIMIT} tweets with focus on identity, voice, contradictions, themes, and the mythology of the profile rather than summarizing tweets one by one.`;
    let profileResolved = false;

    try {
      const profile = await fetchXProfileTweets({
        profileInput,
        maxTweets: X_PROFILE_TWEET_LIMIT,
      });

      subjectName =
        profile.profile.displayName ||
        (normalized.username ? `@${normalized.username}` : "X profile");
      sourceMediaUrl = profile.profile.profileUrl;
      sourceTranscript = profile.transcript;
      requestedPrompt = buildMythXRequestedPrompt({
        username: profile.profile.username,
        tweets: profile.tweets,
      });
      subjectDescription =
        `Biography-first MythX short about @${profile.profile.username}. ` +
        `Built from the last ${X_PROFILE_TWEET_LIMIT} tweets with focus on identity, voice, contradictions, themes, and the mythology of the profile rather than summarizing tweets one by one.`;
      profileResolved = true;
    } catch (error) {
      if (!shouldDeferMythXLookup(error)) {
        throw error;
      }

      logger.warn("mythx_profile_lookup_deferred_to_worker", {
        component: "api",
        route: "/api/video/mythx",
        profileInput,
        username: normalized.username,
        errorCode: "mythx_profile_lookup_deferred",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const job = await createPromptVideoJob({
      requestKind: "mythx",
      packageType: "30s",
      subjectName,
      subjectDescription,
      sourceMediaUrl,
      sourceMediaProvider: "x",
      sourceTranscript,
      requestedPrompt,
      videoSeconds: getSingleClipVideoSeconds(),
      audioEnabled: true,
      visibility: "public",
      pricingMode: "public",
      experience: "mythx",
      paymentWaived: true,
    });

    // Trigger background processing with a soft timeout so this endpoint
    // never hangs for users.
    await triggerJobProcessingSoft({
      jobId: job.jobId,
      logContext: {
        event: "mythx_video_trigger_deferred",
        component: "api",
        route: "/api/video/mythx",
      },
    });

    logger.info("mythx_video_queued", {
      component: "api",
      route: "/api/video/mythx",
      jobId: job.jobId,
      profileInput,
      profileResolved,
    });

    return withDeprecatedHeaders(NextResponse.json({
      jobId: job.jobId,
      status: "pending",
      requestedPrompt,
      deprecatedRoute: "/api/video/mythx",
      successorRoute: "/api/video/create",
    }));
  } catch (error) {
    logger.error("mythx_video_failed", {
      component: "api",
      errorCode: "mythx_video_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return withDeprecatedHeaders(NextResponse.json(
      { error: "Failed to generate MythX video" },
      { status: 500 },
    ));
  }
}
