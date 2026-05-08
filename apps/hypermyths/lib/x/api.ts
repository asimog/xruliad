import { randomUUID } from "crypto";
import { createHmac } from "crypto";
import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import { X_PROFILE_TWEET_LIMIT } from "@/lib/x/constants";

export type XTweet = {
  id: string;
  text: string;
  createdAt: string | null;
};

export type XProfileTweetsResult = {
  profile: {
    displayName: string;
    username: string;
    profileUrl: string;
    description: string | null;
    profileImageUrl: string | null;
  };
  tweets: XTweet[];
  transcript: string;
};

export type XRecentSearchTweet = {
  id: string;
  text: string;
  createdAt: string | null;
  authorName: string | null;
  authorUsername: string | null;
  url: string | null;
  metrics: string | null;
};

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function trimOrNull(value: string | null | undefined): string | null {
  const next = trim(value);
  return next || null;
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/2") ? trimmed : `${trimmed}/2`;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildOAuth1Header(input: {
  method: string;
  url: string;
  query: Record<string, string | number | boolean | undefined>;
}): string | null {
  const env = getEnv();
  const consumerKey = env.X_API_CONSUMER_KEY;
  const consumerSecret = env.X_API_CONSUMER_SECRET;
  const accessToken = env.X_API_ACCESS_TOKEN;
  const accessTokenSecret = env.X_API_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return null;
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const normalizedParams = [
    ...Object.entries(input.query)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          [percentEncode(key), percentEncode(String(value))] as const,
      ),
    ...Object.entries(oauthParams).map(
      ([key, value]) => [percentEncode(key), percentEncode(value)] as const,
    ),
  ].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey
      ? leftValue.localeCompare(rightValue)
      : leftKey.localeCompare(rightKey),
  );

  const parameterString = normalizedParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const baseString = [
    input.method.toUpperCase(),
    percentEncode(input.url),
    percentEncode(parameterString),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  return `OAuth ${Object.entries(headerParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function buildXAuthHeaders(input: {
  method: string;
  url: string;
  query: Record<string, string | number | boolean | undefined>;
  preferBearer?: boolean;
}): Headers {
  const env = getEnv();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "HyperMythsX/1.0 (+https://x.com/HyperMythX)",
  };

  if (input.preferBearer !== false && env.X_API_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${env.X_API_BEARER_TOKEN}`;
    return new Headers(headers);
  }

  const oauthHeader = buildOAuth1Header(input);
  if (oauthHeader) {
    headers.Authorization = oauthHeader;
    return new Headers(headers);
  }

  if (input.preferBearer === false && env.X_API_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${env.X_API_BEARER_TOKEN}`;
    return new Headers(headers);
  }

  throw new Error("X API credentials are not configured yet.");
}

async function fetchWithXAuthFallback(input: {
  url: string;
  query: Record<string, string | number | boolean | undefined>;
  timeoutMs: number;
}): Promise<Response> {
  const attempts: Array<Headers> = [];

  try {
    attempts.push(
      buildXAuthHeaders({
        method: "GET",
        url: input.url,
        query: input.query,
        preferBearer: true,
      }),
    );
  } catch {
    // Fall through and try OAuth-first below.
  }

  try {
    const oauthFirst = buildXAuthHeaders({
      method: "GET",
      url: input.url,
      query: input.query,
      preferBearer: false,
    });
    const oauthAuth = oauthFirst.get("Authorization");
    const alreadyQueued = attempts.some(
      (headers) => headers.get("Authorization") === oauthAuth,
    );
    if (!alreadyQueued) {
      attempts.push(oauthFirst);
    }
  } catch {
    // No OAuth fallback configured.
  }

  if (!attempts.length) {
    throw new Error("X API credentials are not configured yet.");
  }

  let lastResponse: Response | null = null;
  for (const headers of attempts) {
    const response = await fetchWithTimeout(
      input.url,
      {
        headers,
        cache: "no-store",
      },
      input.timeoutMs,
    );

    if (response.ok) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse!;
}

async function describeXApiFailure(
  response: Response,
  input: {
    action: "resolve_profile" | "fetch_tweets";
  },
): Promise<string> {
  const defaultMessage =
    input.action === "resolve_profile"
      ? "Failed to resolve the X profile through the X API."
      : "Failed to fetch the latest tweets from X.";

  let detail = "";
  try {
    const raw = await response.text();
    if (raw) {
      const parsed = JSON.parse(raw) as {
        title?: string;
        detail?: string;
        error?: string;
        errors?: Array<{ title?: string; detail?: string }>;
      };
      detail =
        parsed.detail ||
        parsed.error ||
        parsed.title ||
        parsed.errors?.[0]?.detail ||
        parsed.errors?.[0]?.title ||
        "";
    }
  } catch {
    // Ignore payload parsing failures and fall back to status-only messaging.
  }

  if (response.status === 401 || response.status === 403) {
    return input.action === "resolve_profile"
      ? "X API authentication failed while resolving the X profile."
      : "X API authentication failed while fetching the latest tweets.";
  }

  if (response.status === 404) {
    return input.action === "resolve_profile"
      ? "The X profile could not be resolved."
      : "The X profile tweets could not be loaded.";
  }

  if (response.status === 429) {
    return input.action === "resolve_profile"
      ? "X API rate limit reached while resolving the X profile."
      : "X API rate limit reached while fetching the latest tweets.";
  }

  return detail ? `${defaultMessage} ${detail}` : defaultMessage;
}

function decodeHandleSegment(value: string): string {
  return decodeURIComponent(value).replace(/^@+/, "").trim();
}

/**
 * Export OAuth 1.0a header builder for use in X client posting
 */
export function buildOAuth1aHeaders(input: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}): string | null {
  const env = getEnv();
  const consumerKey = env.X_API_CONSUMER_KEY;
  const consumerSecret = env.X_API_CONSUMER_SECRET;
  const accessToken = env.X_API_ACCESS_TOKEN;
  const accessTokenSecret = env.X_API_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return null;
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // For POST requests, body params are included in the signature base
  const bodyParams = input.body
    ? Object.entries(input.body)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(
          ([key, value]) =>
            [percentEncode(key), percentEncode(String(value))] as const,
        )
    : [];

  const normalizedParams = [
    ...bodyParams,
    ...Object.entries(oauthParams).map(
      ([key, value]) => [percentEncode(key), percentEncode(value)] as const,
    ),
  ].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey
      ? leftValue.localeCompare(rightValue)
      : leftKey.localeCompare(rightKey),
  );

  const parameterString = normalizedParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const baseString = [
    input.method.toUpperCase(),
    percentEncode(input.url),
    percentEncode(parameterString),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  return `OAuth ${Object.entries(headerParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

/**
 * Check if OAuth 1.0a credentials are configured
 */
export function hasOAuth1aCredentials(): boolean {
  const env = getEnv();
  return !!(
    env.X_API_CONSUMER_KEY &&
    env.X_API_CONSUMER_SECRET &&
    env.X_API_ACCESS_TOKEN &&
    env.X_API_ACCESS_TOKEN_SECRET
  );
}

export function hasXReadCredentials(): boolean {
  const env = getEnv();
  return !!(env.X_API_BEARER_TOKEN || hasOAuth1aCredentials());
}

export function normalizeXProfileInput(input: string): {
  username: string | null;
  profileUrl: string | null;
} {
  const trimmed = trim(input);
  if (!trimmed) {
    return { username: null, profileUrl: null };
  }

  const isProfileUrl =
    /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\//i.test(trimmed);

  if (!trimmed.includes("://") && !isProfileUrl) {
    const handle = decodeHandleSegment(trimmed);
    if (!handle) {
      return { username: null, profileUrl: null };
    }
    return {
      username: handle,
      profileUrl: `https://x.com/${encodeURIComponent(handle)}`,
    };
  }

  try {
    const parsed = new URL(
      trimmed.includes("://")
        ? trimmed
        : `https://${trimmed.replace(/^\/+/, "")}`,
    );
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes("x.com") && !host.includes("twitter.com")) {
      return { username: null, profileUrl: null };
    }

    const username = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .find(
        (segment) =>
          !["i", "home", "explore", "search", "intent"].includes(
            segment.toLowerCase(),
          ),
      );

    const decodedUsername = username ? decodeHandleSegment(username) : null;
    if (!decodedUsername) {
      return { username: null, profileUrl: null };
    }

    return {
      username: decodedUsername,
      profileUrl: `https://x.com/${encodeURIComponent(decodedUsername)}`,
    };
  } catch {
    const handle = decodeHandleSegment(trimmed);
    if (!handle) {
      return { username: null, profileUrl: null };
    }

    return {
      username: handle,
      profileUrl: `https://x.com/${encodeURIComponent(handle)}`,
    };
  }
}

export async function fetchXProfileTweets(input: {
  profileInput: string;
  maxTweets?: number;
}): Promise<XProfileTweetsResult> {
  const baseUrl = process.env.X_API_BASE_URL?.trim() || "https://api.x.com/2";

  const normalized = normalizeXProfileInput(input.profileInput);
  if (!normalized.username || !normalized.profileUrl) {
    throw new Error("Enter a valid X profile link or @handle.");
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const maxTweets = Math.max(
    1,
    Math.min(X_PROFILE_TWEET_LIMIT, input.maxTweets ?? X_PROFILE_TWEET_LIMIT),
  );
  const userUrl = `${normalizedBaseUrl}/users/by/username/${encodeURIComponent(normalized.username)}`;
  const userQuery = {
    "user.fields": "description,profile_image_url,name,username",
  } as const;
  const userResponse = await fetchWithXAuthFallback({
    url: `${userUrl}?user.fields=description,profile_image_url,name,username`,
    query: userQuery,
    timeoutMs: 15_000,
  });

  if (!userResponse.ok) {
    throw new Error(
      await describeXApiFailure(userResponse, { action: "resolve_profile" }),
    );
  }

  const userPayload = (await userResponse.json()) as {
    data?: {
      id?: string;
      name?: string;
      username?: string;
      description?: string;
      profile_image_url?: string;
    };
    errors?: Array<{ detail?: string; title?: string }>;
  };

  const user = userPayload.data;
  if (!user?.id || !user.username) {
    throw new Error("The X profile could not be resolved.");
  }

  const tweetsUrl = `${normalizedBaseUrl}/users/${encodeURIComponent(user.id)}/tweets`;
  const tweetsResponse = await fetchWithXAuthFallback({
    url: `${tweetsUrl}?max_results=${maxTweets}&tweet.fields=created_at`,
    query: {
      max_results: maxTweets,
      "tweet.fields": "created_at",
    },
    timeoutMs: 15_000,
  });

  if (!tweetsResponse.ok) {
    throw new Error(
      await describeXApiFailure(tweetsResponse, { action: "fetch_tweets" }),
    );
  }

  const tweetsPayload = (await tweetsResponse.json()) as {
    data?: Array<{
      id?: string;
      text?: string;
      created_at?: string;
    }>;
  };

  const tweets = (tweetsPayload.data ?? [])
    .map((tweet) => ({
      id: tweet.id ?? randomUUID(),
      text: trim(tweet.text),
      createdAt: trimOrNull(tweet.created_at),
    }))
    .filter((tweet) => Boolean(tweet.text));

  if (!tweets.length) {
    throw new Error(
      "The X profile has no tweets available to build the autobiography.",
    );
  }

  return {
    profile: {
      displayName: trim(user.name) || normalized.username,
      username: user.username,
      profileUrl: normalized.profileUrl,
      description: trimOrNull(user.description),
      profileImageUrl: trimOrNull(user.profile_image_url),
    },
    tweets,
    transcript: tweets
      .map((tweet, index) => `${index + 1}. ${tweet.text}`)
    .join("\n"),
  };
}

export async function fetchXRecentSearchTweets(input: {
  query: string;
  maxTweets?: number;
}): Promise<XRecentSearchTweet[]> {
  const baseUrl = process.env.X_API_BASE_URL?.trim() || "https://api.x.com/2";
  const normalizedQuery = input.query.trim();

  if (!normalizedQuery) {
    throw new Error("Enter a valid X search query.");
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const maxTweets = Math.max(1, Math.min(10, input.maxTweets ?? 10));
  const searchUrl = new URL(`${normalizedBaseUrl}/tweets/search/recent`);
  searchUrl.searchParams.set("query", normalizedQuery);
  searchUrl.searchParams.set("max_results", String(maxTweets));
  searchUrl.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
  searchUrl.searchParams.set("expansions", "author_id");
  searchUrl.searchParams.set("user.fields", "name,username");

  const response = await fetchWithXAuthFallback({
    url: searchUrl.toString(),
    query: {
      query: normalizedQuery,
      max_results: maxTweets,
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "name,username",
    },
    timeoutMs: 15_000,
  });

  if (!response.ok) {
    throw new Error(await describeXApiFailure(response, { action: "fetch_tweets" }));
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id?: string;
      text?: string;
      created_at?: string;
      author_id?: string;
      public_metrics?: {
        like_count?: number;
        retweet_count?: number;
        reply_count?: number;
        quote_count?: number;
      };
    }>;
    includes?: {
      users?: Array<{
        id?: string;
        name?: string;
        username?: string;
      }>;
    };
  };

  const users = new Map(
    (payload.includes?.users ?? [])
      .filter((user): user is { id: string; name?: string; username?: string } => Boolean(user.id))
      .map((user) => [
        user.id,
        {
          name: trimOrNull(user.name),
          username: trimOrNull(user.username),
        },
      ]),
  );

  return (payload.data ?? [])
    .map((tweet) => {
      const text = trim(tweet.text);
      if (!text) return null;

      const author = tweet.author_id ? users.get(tweet.author_id) ?? null : null;
      const metrics = tweet.public_metrics
        ? [
            typeof tweet.public_metrics.like_count === "number" ? `${tweet.public_metrics.like_count} likes` : null,
            typeof tweet.public_metrics.retweet_count === "number"
              ? `${tweet.public_metrics.retweet_count} reposts`
              : null,
            typeof tweet.public_metrics.reply_count === "number"
              ? `${tweet.public_metrics.reply_count} replies`
              : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(" · ") || null
        : null;

      return {
        id: tweet.id ?? randomUUID(),
        text,
        createdAt: trimOrNull(tweet.created_at),
        authorName: author?.name ?? null,
        authorUsername: author?.username ?? null,
        url: tweet.id ? `https://x.com/i/web/status/${tweet.id}` : null,
        metrics,
      } satisfies XRecentSearchTweet;
    })
    .filter((tweet): tweet is XRecentSearchTweet => Boolean(tweet));
}
