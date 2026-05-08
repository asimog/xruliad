import { z } from "zod";

import { getEnv } from "@/lib/env";
import { generateTextInferenceJson } from "@/lib/inference/text";
import { fetchWithTimeout } from "@/lib/network/http";
import {
  fetchXRecentSearchTweets,
  hasXReadCredentials,
} from "@/lib/x/api";

const DEXSCREENER_BASE_URL = "https://api.dexscreener.com";
const GMGN_OPENAPI_BASE_URL = "https://openapi.gmgn.ai";
const DEFAULT_XACTIONS_MCP_URL = "https://modelcontextprotocol.name/mcp/xactions";

export const scannerChainSchema = z
  .enum(["solana", "ethereum", "bsc", "base", "arbitrum", "optimism", "polygon"])
  .default("solana");

export type ScannerChain = z.infer<typeof scannerChainSchema>;

type ProviderStatus = "ok" | "missing_key" | "not_applicable" | "error";

type SocialTweet = {
  author: string | null;
  handle: string | null;
  text: string;
  url: string | null;
  metrics: string | null;
};

type AnalysisCategories = {
  technical: string[];
  market: string[];
  thesis: string[];
  public: string[];
};

type ScanArticle = {
  title: string;
  summary: string[];
  story: string[];
  embeddedTweets: SocialTweet[];
};

export type TokenScanResult = {
  address: string;
  chain: ScannerChain;
  generatedAt: string;
  agent: {
    name: "Hermes";
    status: ProviderStatus;
    xActionsStatus: ProviderStatus;
    summary: string;
  };
  providerStatus: {
    helius: ProviderStatus;
    dexscreener: ProviderStatus;
    birdeye: ProviderStatus;
    gmgn: ProviderStatus;
    hermes: ProviderStatus;
    xactions: ProviderStatus;
  };
  token: {
    name: string | null;
    symbol: string | null;
    logoUrl: string | null;
    priceUsd: number | null;
    marketCapUsd: number | null;
    liquidityUsd: number | null;
    volume24hUsd: number | null;
    priceChange24hPercent: number | null;
    holders: number | null;
    supply: number | null;
    decimals: number | null;
  };
  categories: AnalysisCategories;
  risk: {
    score: number;
    label: "Lower" | "Medium" | "High" | "Unknown";
    flags: string[];
  };
  article: ScanArticle;
  sources: {
    helius: {
      asset: unknown | null;
      supply: unknown | null;
      largestAccounts: unknown | null;
    };
    dexscreener: {
      pairUrl: string | null;
      dexId: string | null;
      boosts: number | null;
      rawPair: unknown | null;
    };
    birdeye: {
      overview: unknown | null;
      security: unknown | null;
    };
    gmgn: {
      summary: string;
      tokenInfo: unknown | null;
      kolTrades: unknown | null;
      smartMoneyTrades: unknown | null;
    };
    social: {
      tweets: SocialTweet[];
      raw: unknown | null;
    };
  };
};

export type TrendingToken = {
  address: string;
  chain: ScannerChain;
  name: string | null;
  symbol: string | null;
  logoUrl: string | null;
  rank: number | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceChange24hPercent: number | null;
  sources: string[];
  riskLabel: TokenScanResult["risk"]["label"];
  riskFlags: string[];
  pairUrl: string | null;
};

export type TrendingTokensResult = {
  chain: ScannerChain;
  providerStatus: Pick<
    TokenScanResult["providerStatus"],
    "helius" | "dexscreener" | "birdeye" | "gmgn"
  >;
  tokens: TrendingToken[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getPath(input: unknown, path: string[]): unknown {
  let current = input;
  for (const segment of path) current = asRecord(current)[segment];
  return current;
}

function stringAt(input: unknown, paths: string[][]): string | null {
  for (const path of paths) {
    const value = getPath(input, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberAt(input: unknown, paths: string[][]): number | null {
  for (const path of paths) {
    const value = getPath(input, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function arrayAt(input: unknown, paths: string[][]): unknown[] {
  for (const path of paths) {
    const value = getPath(input, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function readJsonResponse(response: Response): Promise<unknown | null> {
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

function providerStatusFromResults(
  results: Array<{ status: ProviderStatus }>,
): ProviderStatus {
  if (results.some((result) => result.status === "ok")) return "ok";
  if (results.every((result) => result.status === "missing_key")) return "missing_key";
  if (results.every((result) => result.status === "not_applicable")) return "not_applicable";
  return "error";
}

async function birdeyeGet(path: string, address: string, chain: ScannerChain) {
  const env = getEnv();
  if (!env.BIRDEYE_API_KEY) return { status: "missing_key" as const, data: null };

  const url = new URL(path, env.BIRDEYE_API_BASE_URL);
  url.searchParams.set("address", address);

  try {
    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          "X-API-KEY": env.BIRDEYE_API_KEY,
          "x-chain": chain,
          accept: "application/json",
        },
        cache: "no-store",
      },
      10_000,
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) return { status: "error" as const, data: payload };
    return { status: "ok" as const, data: asRecord(payload).data ?? payload };
  } catch (error) {
    return {
      status: "error" as const,
      data: { error: error instanceof Error ? error.message : "Birdeye failed" },
    };
  }
}

async function birdeyeTrending(chain: ScannerChain, limit: number) {
  const env = getEnv();
  if (!env.BIRDEYE_API_KEY) return { status: "missing_key" as const, tokens: [] as unknown[] };

  const url = new URL("/defi/token_trending", env.BIRDEYE_API_BASE_URL);
  url.searchParams.set("sort_by", "rank");
  url.searchParams.set("sort_type", "asc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 20)));

  try {
    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          "X-API-KEY": env.BIRDEYE_API_KEY,
          "x-chain": chain,
          accept: "application/json",
        },
        cache: "no-store",
      },
      10_000,
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) return { status: "error" as const, tokens: [] as unknown[] };
    return {
      status: "ok" as const,
      tokens: arrayAt(payload, [["data", "tokens"], ["tokens"]]),
    };
  } catch {
    return { status: "error" as const, tokens: [] as unknown[] };
  }
}

async function heliusRpc(method: string, params: unknown[], chain: ScannerChain) {
  const env = getEnv();
  if (chain !== "solana") return { status: "not_applicable" as const, data: null };
  if (!env.HELIUS_API_KEY && !env.SOLANA_DAS_RPC_URL && !env.SOLANA_RPC_URL) {
    return { status: "missing_key" as const, data: null };
  }

  const url =
    env.SOLANA_DAS_RPC_URL ??
    env.SOLANA_RPC_URL ??
    `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(env.HELIUS_API_KEY ?? "")}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "hypermyths-token-scan",
          method,
          params,
        }),
        cache: "no-store",
      },
      12_000,
    );
    const payload = await readJsonResponse(response);
    if (!response.ok || asRecord(payload).error) {
      return { status: "error" as const, data: payload };
    }
    return { status: "ok" as const, data: asRecord(payload).result ?? payload };
  } catch (error) {
    return {
      status: "error" as const,
      data: { error: error instanceof Error ? error.message : "Helius failed" },
    };
  }
}

async function getHeliusSignals(address: string, chain: ScannerChain) {
  const [asset, supply, largestAccounts] = await Promise.all([
    heliusRpc("getAsset", [{ id: address }], chain),
    heliusRpc("getTokenSupply", [address], chain),
    heliusRpc("getTokenLargestAccounts", [address], chain),
  ]);

  return {
    status: providerStatusFromResults([asset, supply, largestAccounts]),
    asset: asset.data,
    supply: supply.data,
    largestAccounts: largestAccounts.data,
  };
}

async function dexscreenerPairs(addresses: string[], chain: ScannerChain) {
  if (!addresses.length) return { status: "ok" as const, pairs: [] as unknown[] };
  try {
    const response = await fetchWithTimeout(
      `${DEXSCREENER_BASE_URL}/tokens/v1/${encodeURIComponent(chain)}/${addresses
        .slice(0, 30)
        .map(encodeURIComponent)
        .join(",")}`,
      { headers: { accept: "application/json" }, cache: "no-store" },
      10_000,
    );
    if (!response.ok) return { status: "error" as const, pairs: [] as unknown[] };
    const payload = (await response.json()) as unknown;
    return { status: "ok" as const, pairs: Array.isArray(payload) ? payload : [] };
  } catch {
    return { status: "error" as const, pairs: [] as unknown[] };
  }
}

async function dexscreenerLatestProfiles(chain: ScannerChain, limit: number) {
  try {
    const response = await fetchWithTimeout(
      `${DEXSCREENER_BASE_URL}/token-profiles/latest/v1`,
      { headers: { accept: "application/json" }, cache: "no-store" },
      10_000,
    );
    if (!response.ok) return { status: "error" as const, profiles: [] as unknown[] };
    const payload = (await response.json()) as unknown;
    const profiles = (Array.isArray(payload) ? payload : [])
      .filter((item) => stringAt(item, [["chainId"]]) === chain)
      .slice(0, limit);
    return { status: "ok" as const, profiles };
  } catch {
    return { status: "error" as const, profiles: [] as unknown[] };
  }
}

function bestDexPair(pairs: unknown[], address: string): unknown | null {
  const matching = pairs.filter((pair) => {
    const baseAddress = stringAt(pair, [["baseToken", "address"]]);
    return baseAddress?.toLowerCase() === address.toLowerCase();
  });

  return [...matching].sort((left, right) => {
    const leftScore =
      (numberAt(left, [["liquidity", "usd"]]) ?? 0) * 100 +
      (numberAt(left, [["volume", "h24"]]) ?? 0) * 10 +
      (numberAt(left, [["marketCap"], ["fdv"]]) ?? 0);
    const rightScore =
      (numberAt(right, [["liquidity", "usd"]]) ?? 0) * 100 +
      (numberAt(right, [["volume", "h24"]]) ?? 0) * 10 +
      (numberAt(right, [["marketCap"], ["fdv"]]) ?? 0);
    return rightScore - leftScore;
  })[0] ?? null;
}

function gmgnChain(chain: ScannerChain): string {
  if (chain === "solana") return "sol";
  if (chain === "ethereum") return "eth";
  return chain;
}

async function gmgnGet(path: string, query: Record<string, string | number | undefined>) {
  const env = getEnv();
  if (!env.GMGN_API_KEY) return null;

  const url = new URL(path, GMGN_OPENAPI_BASE_URL);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        "X-APIKEY": env.GMGN_API_KEY,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    12_000,
  );

  if (!response.ok) throw new Error(`GMGN request failed (${response.status}).`);
  return (await response.json()) as unknown;
}

async function getGmgnSignals(address: string, chain: ScannerChain): Promise<TokenScanResult["sources"]["gmgn"]> {
  const env = getEnv();
  if (!env.GMGN_API_KEY) {
    return {
      summary: "GMGN unavailable: API key is not configured.",
      tokenInfo: null,
      kolTrades: null,
      smartMoneyTrades: null,
    };
  }

  try {
    const chainArg = gmgnChain(chain);
    const [tokenInfo, kolTrades, smartMoneyTrades] = await Promise.all([
      gmgnGet("/v1/token/info", { chain: chainArg, address }),
      gmgnGet("/v1/user/kol", { chain: chainArg, limit: 20 }),
      gmgnGet("/v1/user/smartmoney", { chain: chainArg, limit: 20 }),
    ]);

    return {
      summary: "GMGN returned token, KOL, and smart-money signal payloads.",
      tokenInfo,
      kolTrades,
      smartMoneyTrades,
    };
  } catch {
    return {
      summary: "GMGN request failed or returned an unsupported response.",
      tokenInfo: null,
      kolTrades: null,
      smartMoneyTrades: null,
    };
  }
}

async function callXActionsMcp(topic: string) {
  const env = getEnv();
  const endpoint = env.XACTIONS_MCP_URL ?? DEFAULT_XACTIONS_MCP_URL;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "hypermyths-xactions",
          method: "tools/call",
          params: {
            name: "analyze_social_sentiment",
            arguments: { topic },
          },
        }),
        cache: "no-store",
      },
      15_000,
    );
    const payload = await readJsonResponse(response);
    if (!response.ok || asRecord(payload).error) {
      return { status: "error" as const, data: payload };
    }
    return { status: "ok" as const, data: payload };
  } catch (error) {
    return {
      status: "error" as const,
      data: { error: error instanceof Error ? error.message : "XActions failed" },
    };
  }
}

async function callHermesXActions(input: {
  address: string;
  symbol: string | null;
  name: string | null;
}) {
  const env = getEnv();
  const topic = [input.symbol ? `$${input.symbol}` : null, input.name, input.address]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  if (!env.HERMES_AGENT_API_URL) {
    const xactions = await callXActionsMcp(topic);
    return {
      hermesStatus: "missing_key" as ProviderStatus,
      xActionsStatus: xactions.status,
      raw: xactions.data,
      summary:
        xactions.status === "ok"
          ? "Hermes endpoint is not configured, so the XActions MCP social check ran directly."
          : "Hermes endpoint is not configured and XActions did not return live social data.",
    };
  }

  try {
    const response = await fetchWithTimeout(
      env.HERMES_AGENT_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          ...(env.HERMES_AGENT_API_KEY ? { Authorization: `Bearer ${env.HERMES_AGENT_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          agent: "hermes",
          task: "token_social_scan",
          tool: "xactions",
          prompt:
            "Use XActions to inspect major X/Twitter activity, influential posts, account mentions, and public sentiment for this memecoin. Return notable tweets with author, handle, URL, engagement, and concise analysis.",
          input: {
            address: input.address,
            symbol: input.symbol,
            name: input.name,
            topic,
          },
        }),
        cache: "no-store",
      },
      20_000,
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return {
        hermesStatus: "error" as ProviderStatus,
        xActionsStatus: "error" as ProviderStatus,
        raw: payload,
        summary: "Hermes agent request failed before XActions could be confirmed.",
      };
    }
    return {
      hermesStatus: "ok" as ProviderStatus,
      xActionsStatus: "ok" as ProviderStatus,
      raw: payload,
      summary: "Hermes ran the token social scan through the XActions tool contract.",
    };
  } catch (error) {
    return {
      hermesStatus: "error" as ProviderStatus,
      xActionsStatus: "error" as ProviderStatus,
      raw: { error: error instanceof Error ? error.message : "Hermes failed" },
      summary: "Hermes agent request failed before XActions could be confirmed.",
    };
  }
}

function buildXSearchQuery(input: { symbol: string | null; name: string | null }): string | null {
  const terms = [
    input.symbol ? `"$${input.symbol.replace(/[$"]/g, "")}"` : null,
    input.name ? `"${input.name.replace(/"/g, "")}"` : null,
  ].filter((term): term is string => Boolean(term));

  if (!terms.length) return null;
  return `(${terms.join(" OR ")}) -is:retweet -is:reply lang:en`;
}

async function callXApiFallback(input: {
  address: string;
  symbol: string | null;
  name: string | null;
}) {
  const query = buildXSearchQuery({ symbol: input.symbol, name: input.name });
  if (!query || !hasXReadCredentials()) {
    return {
      status: "missing_key" as ProviderStatus,
      tweets: [] as SocialTweet[],
      raw: null,
      summary: "X API fallback was not available for this scan.",
    };
  }

  try {
    const results = await fetchXRecentSearchTweets({ query, maxTweets: 5 });
    const tweets = results.map((tweet) => ({
      author: tweet.authorName,
      handle: tweet.authorUsername,
      text: tweet.text,
      url: tweet.url,
      metrics: tweet.metrics,
    }));

    return {
      status: tweets.length ? ("ok" as ProviderStatus) : ("error" as ProviderStatus),
      tweets,
      raw: results,
      summary: tweets.length
        ? "X API recent search returned embeddable posts for the token scan."
        : "X API recent search returned no embeddable posts for this token.",
    };
  } catch (error) {
    return {
      status: "error" as ProviderStatus,
      tweets: [] as SocialTweet[],
      raw: { error: error instanceof Error ? error.message : "X API fallback failed" },
      summary: "X API fallback failed for this token scan.",
    };
  }
}

async function callGmgnSocialFallback(input: {
  address: string;
  symbol: string | null;
  name: string | null;
  gmgn: TokenScanResult["sources"]["gmgn"];
}) {
  const details = [
    input.gmgn.summary,
    input.gmgn.tokenInfo ? "GMGN token info was available." : null,
    input.gmgn.kolTrades ? "GMGN KOL signals were available." : null,
    input.gmgn.smartMoneyTrades ? "GMGN smart-money signals were available." : null,
  ].filter((piece): piece is string => Boolean(piece));

  return {
    status:
      input.gmgn.tokenInfo || input.gmgn.kolTrades || input.gmgn.smartMoneyTrades
        ? ("ok" as ProviderStatus)
        : ("error" as ProviderStatus),
    tweets: [
      {
        author: input.symbol ? `$${input.symbol}` : input.name ?? input.address,
        handle: null,
        text:
          details.length > 0
            ? `GMGN fallback: ${details.join(" ")}`
            : "GMGN fallback did not return social context for this token.",
        url: null,
        metrics: null,
      } as SocialTweet,
    ],
    raw: input.gmgn,
    summary: "GMGN fallback supplied token context when X posts were unavailable.",
  };
}

function extractTweets(raw: unknown): SocialTweet[] {
  const candidates = [
    ...arrayAt(raw, [["tweets"]]),
    ...arrayAt(raw, [["result", "tweets"]]),
    ...arrayAt(raw, [["result", "content", "tweets"]]),
    ...arrayAt(raw, [["data", "tweets"]]),
  ];

  return candidates
    .map((tweet): SocialTweet | null => {
      const text = stringAt(tweet, [["text"], ["content"], ["body"]]);
      if (!text) return null;
      return {
        author: stringAt(tweet, [["author"], ["name"], ["user", "name"]]),
        handle: stringAt(tweet, [["handle"], ["username"], ["user", "username"]]),
        text,
        url: stringAt(tweet, [["url"], ["tweetUrl"], ["link"]]),
        metrics:
          stringAt(tweet, [["metrics"], ["engagement"]]) ??
          (numberAt(tweet, [["likes"], ["likeCount"]]) !== null
            ? `${numberAt(tweet, [["likes"], ["likeCount"]])} likes`
            : null),
      };
    })
    .filter((tweet): tweet is SocialTweet => Boolean(tweet))
    .slice(0, 4);
}

function buildRisk(input: {
  overview: unknown;
  security: unknown;
  helius: Awaited<ReturnType<typeof getHeliusSignals>>;
  dexPair: unknown | null;
}): TokenScanResult["risk"] {
  const flags: string[] = [];
  const security = asRecord(input.security);

  const booleanChecks: Array<[string, string]> = [
    ["honeypot", "Honeypot risk"],
    ["is_honeypot", "Honeypot risk"],
    ["is_scam", "Scam warning"],
    ["is_blacklisted", "Blacklist control"],
    ["is_proxy", "Proxy contract"],
    ["can_take_back_ownership", "Ownership can return"],
    ["owner_change_balance", "Owner can change balances"],
    ["hidden_owner", "Hidden owner"],
  ];

  for (const [key, label] of booleanChecks) {
    if (security[key] === true || security[key] === "true" || security[key] === 1) flags.push(label);
  }

  const liquidity =
    numberAt(input.overview, [["liquidity"], ["liquidityUsd"]]) ??
    numberAt(input.dexPair, [["liquidity", "usd"]]);
  const volume =
    numberAt(input.overview, [["v24hUSD"], ["volume24h"], ["volume24hUSD"]]) ??
    numberAt(input.dexPair, [["volume", "h24"]]);
  const holders = numberAt(input.overview, [["holder"], ["holders"], ["holderCount"]]);
  const topAccounts = arrayAt(input.helius.largestAccounts, [["value"]]);
  const topShare = numberAt(topAccounts[0], [["uiAmount"], ["amount"]]);
  const supply = numberAt(input.helius.supply, [["value", "uiAmount"], ["uiAmount"]]);

  if (liquidity !== null && liquidity < 10_000) flags.push("Thin liquidity");
  if (volume !== null && volume < 5_000) flags.push("Low 24h volume");
  if (holders !== null && holders < 250) flags.push("Small holder base");
  if (supply && topShare && topShare / supply > 0.25) flags.push("Top holder concentration");

  const score = Math.min(100, flags.length * 18);
  const label =
    flags.length === 0 ? "Lower" : flags.length <= 2 ? "Medium" : flags.length <= 5 ? "High" : "Unknown";

  return { score, label, flags: flags.slice(0, 8) };
}

function tokenIdentity(input: {
  overview: unknown;
  asset: unknown;
  dexPair: unknown | null;
}) {
  return {
    name:
      stringAt(input.overview, [["name"], ["tokenName"]]) ??
      stringAt(input.asset, [["content", "metadata", "name"], ["content", "json_uri"]]) ??
      stringAt(input.dexPair, [["baseToken", "name"]]),
    symbol:
      stringAt(input.overview, [["symbol"], ["tokenSymbol"]]) ??
      stringAt(input.asset, [["content", "metadata", "symbol"]]) ??
      stringAt(input.dexPair, [["baseToken", "symbol"]]),
    logoUrl:
      stringAt(input.overview, [["logoURI"], ["logoUrl"], ["logo"]]) ??
      stringAt(input.asset, [["content", "links", "image"], ["content", "files", "0", "uri"]]) ??
      stringAt(input.dexPair, [["info", "imageUrl"]]),
  };
}

function compactUsd(value: number | null): string {
  if (value === null) return "unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1 ? 2 : 8,
  }).format(value);
}

function compactNumber(value: number | null): string {
  if (value === null) return "unavailable";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
}

async function buildCategoriesWithHermes(input: {
  tokenName: string;
  symbol: string | null;
  token: TokenScanResult["token"];
  risk: TokenScanResult["risk"];
  providerStatus: TokenScanResult["providerStatus"];
  socialSummary: string;
}): Promise<AnalysisCategories> {
  const fallback: AnalysisCategories = {
    technical: [
      `Helius supply reads ${compactNumber(input.token.supply)} with ${input.token.decimals ?? "unknown"} decimals.`,
      input.risk.flags.length
        ? `Contract/security flags: ${input.risk.flags.join(", ")}.`
        : "No major contract/security flags were returned by the configured scanners.",
    ],
    market: [
      `Liquidity is ${compactUsd(input.token.liquidityUsd)} and 24h volume is ${compactUsd(input.token.volume24hUsd)}.`,
      `Market cap is ${compactUsd(input.token.marketCapUsd)} with a 24h move of ${
        input.token.priceChange24hPercent === null ? "unavailable" : `${input.token.priceChange24hPercent.toFixed(2)}%`
      }.`,
    ],
    thesis: [
      `${input.tokenName} needs alignment between liquidity depth, holder spread, and social attention before the thesis looks durable.`,
      "A stronger thesis requires repeated smart-money activity plus public narrative that is not only short-term price chasing.",
    ],
    public: [
      input.socialSummary,
      `Provider coverage: Helius ${input.providerStatus.helius}, DexScreener ${input.providerStatus.dexscreener}, Birdeye ${input.providerStatus.birdeye}, GMGN ${input.providerStatus.gmgn}.`,
    ],
  };

  try {
    const result = await generateTextInferenceJson<AnalysisCategories>({
      temperature: 0.2,
      maxTokens: 520,
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. You are Hermes writing a concise memecoin scan. Divide the analysis into technical, market, thesis, and public arrays. No financial advice. Avoid old media-generation language.",
        },
        {
          role: "user",
          content: JSON.stringify({
            tokenName: input.tokenName,
            symbol: input.symbol,
            token: input.token,
            risk: input.risk,
            providerStatus: input.providerStatus,
            socialSummary: input.socialSummary,
          }),
        },
      ],
    });
    const parsed = z
      .object({
        technical: z.array(z.string()).min(1).max(4),
        market: z.array(z.string()).min(1).max(4),
        thesis: z.array(z.string()).min(1).max(4),
        public: z.array(z.string()).min(1).max(4),
      })
      .safeParse(result);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

function buildArticle(input: {
  tokenName: string;
  symbol: string | null;
  categories: AnalysisCategories;
  tweets: SocialTweet[];
}): ScanArticle {
  const ticker = input.symbol ? `$${input.symbol}` : input.tokenName;
  return {
    title: `${ticker} Memecoin Scan`,
    summary: [
      input.categories.market[0] ?? `${ticker} has limited market data right now.`,
      input.categories.technical[0] ?? "On-chain structure needs more inspection.",
      input.categories.public[0] ?? "Public attention is still forming.",
    ],
    story: [
      `${ticker} starts with the on-chain read: ${input.categories.technical.join(" ")}`,
      `The market setup is the second layer. ${input.categories.market.join(" ")}`,
      `The thesis lives or dies on whether the meme can turn attention into repeat participation. ${input.categories.thesis.join(" ")}`,
      `Public signal matters here because memecoins are narrative markets. ${input.categories.public.join(" ")}`,
    ],
    embeddedTweets: input.tweets,
  };
}

function mergeTrendingToken(input: {
  current?: TrendingToken;
  address: string;
  chain: ScannerChain;
  birdeye?: unknown;
  dexPair?: unknown | null;
  dexProfile?: unknown | null;
  security?: unknown | null;
  helius?: Awaited<ReturnType<typeof getHeliusSignals>>;
}): TrendingToken {
  const sources = new Set(input.current?.sources ?? []);
  if (input.helius?.status === "ok") sources.add("Helius");
  if (input.birdeye) sources.add("Birdeye");
  if (input.dexPair || input.dexProfile) sources.add("DexScreener");

  const risk = buildRisk({
    overview: input.birdeye ?? input.dexPair ?? {},
    security: input.security ?? {},
    helius: input.helius ?? { status: "not_applicable", asset: null, supply: null, largestAccounts: null },
    dexPair: input.dexPair ?? null,
  });

  return {
    address: input.address,
    chain: input.chain,
    name:
      stringAt(input.birdeye, [["name"], ["tokenName"]]) ??
      stringAt(input.dexPair, [["baseToken", "name"]]) ??
      stringAt(input.dexProfile, [["description"]]) ??
      input.current?.name ??
      null,
    symbol:
      stringAt(input.birdeye, [["symbol"], ["tokenSymbol"]]) ??
      stringAt(input.dexPair, [["baseToken", "symbol"]]) ??
      input.current?.symbol ??
      null,
    logoUrl:
      stringAt(input.birdeye, [["logoURI"], ["logoUrl"], ["logo"]]) ??
      stringAt(input.dexProfile, [["icon"]]) ??
      stringAt(input.dexPair, [["info", "imageUrl"]]) ??
      input.current?.logoUrl ??
      null,
    rank: numberAt(input.birdeye, [["rank"]]) ?? input.current?.rank ?? null,
    priceUsd:
      numberAt(input.birdeye, [["price"], ["priceUsd"]]) ??
      numberAt(input.dexPair, [["priceUsd"]]) ??
      input.current?.priceUsd ??
      null,
    marketCapUsd:
      numberAt(input.birdeye, [["mc"], ["marketCap"], ["marketCapUsd"]]) ??
      numberAt(input.dexPair, [["marketCap"], ["fdv"]]) ??
      input.current?.marketCapUsd ??
      null,
    liquidityUsd:
      numberAt(input.birdeye, [["liquidity"], ["liquidityUsd"]]) ??
      numberAt(input.dexPair, [["liquidity", "usd"]]) ??
      input.current?.liquidityUsd ??
      null,
    volume24hUsd:
      numberAt(input.birdeye, [["v24hUSD"], ["volume24h"], ["volume24hUSD"]]) ??
      numberAt(input.dexPair, [["volume", "h24"]]) ??
      input.current?.volume24hUsd ??
      null,
    priceChange24hPercent:
      numberAt(input.birdeye, [["priceChange24hPercent"], ["priceChange24h"]]) ??
      numberAt(input.dexPair, [["priceChange", "h24"]]) ??
      input.current?.priceChange24hPercent ??
      null,
    sources: [...sources],
    riskLabel: risk.label,
    riskFlags: risk.flags,
    pairUrl: stringAt(input.dexPair, [["url"]]) ?? input.current?.pairUrl ?? null,
  };
}

export async function scanToken(input: {
  address: string;
  chain?: ScannerChain;
}): Promise<TokenScanResult> {
  const chain = input.chain ?? "solana";
  const address = input.address.trim();

  const [helius, overviewResult, securityResult, gmgn, dexResult] = await Promise.all([
    getHeliusSignals(address, chain),
    birdeyeGet("/defi/token_overview", address, chain),
    birdeyeGet("/defi/token_security", address, chain),
    getGmgnSignals(address, chain),
    dexscreenerPairs([address], chain),
  ]);

  const overview = overviewResult.data;
  const security = securityResult.data;
  const dexPair = bestDexPair(dexResult.pairs, address);
  const identity = tokenIdentity({ overview, asset: helius.asset, dexPair });
  const tokenName = identity.name || identity.symbol || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const social = await callHermesXActions({
    address,
    symbol: identity.symbol,
    name: identity.name,
  });
  let tweets = extractTweets(social.raw);
  let socialSummary = social.summary;
  let socialRaw: unknown = social.raw;

  if (!tweets.length) {
    const xApiFallback = await callXApiFallback({
      address,
      symbol: identity.symbol,
      name: identity.name,
    });
    tweets = xApiFallback.tweets;
    socialSummary = xApiFallback.summary;
    socialRaw = {
      hermes: social.raw,
      xApi: xApiFallback.raw,
    };
  }

  if (!tweets.length) {
    const gmgnFallback = await callGmgnSocialFallback({
      address,
      symbol: identity.symbol,
      name: identity.name,
      gmgn,
    });
    tweets = gmgnFallback.tweets;
    socialSummary = gmgnFallback.summary;
    socialRaw = {
      hermes: social.raw,
      gmgn: gmgnFallback.raw,
    };
  }

  const token = {
    name: identity.name,
    symbol: identity.symbol,
    logoUrl: identity.logoUrl,
    priceUsd:
      numberAt(overview, [["price"], ["priceUsd"]]) ?? numberAt(dexPair, [["priceUsd"]]),
    marketCapUsd:
      numberAt(overview, [["mc"], ["marketCap"], ["marketCapUsd"]]) ??
      numberAt(dexPair, [["marketCap"], ["fdv"]]),
    liquidityUsd:
      numberAt(overview, [["liquidity"], ["liquidityUsd"]]) ??
      numberAt(dexPair, [["liquidity", "usd"]]),
    volume24hUsd:
      numberAt(overview, [["v24hUSD"], ["volume24h"], ["volume24hUSD"]]) ??
      numberAt(dexPair, [["volume", "h24"]]),
    priceChange24hPercent:
      numberAt(overview, [["priceChange24hPercent"], ["priceChange24h"], ["priceChange24hUSD"]]) ??
      numberAt(dexPair, [["priceChange", "h24"]]),
    holders: numberAt(overview, [["holder"], ["holders"], ["holderCount"]]),
    supply: numberAt(helius.supply, [["value", "uiAmount"], ["uiAmount"]]),
    decimals: numberAt(helius.supply, [["value", "decimals"], ["decimals"]]),
  };

  const risk = buildRisk({ overview, security, helius, dexPair });
  const providerStatus = {
    helius: helius.status,
    dexscreener: dexResult.status,
    birdeye: providerStatusFromResults([overviewResult, securityResult]),
    gmgn: gmgn.tokenInfo || gmgn.kolTrades || gmgn.smartMoneyTrades ? "ok" as const : getEnv().GMGN_API_KEY ? "error" as const : "missing_key" as const,
    hermes: social.hermesStatus,
    xactions: social.xActionsStatus,
  };
  const categories = await buildCategoriesWithHermes({
    tokenName,
    symbol: identity.symbol,
    token,
    risk,
    providerStatus,
    socialSummary,
  });
  const article = buildArticle({ tokenName, symbol: identity.symbol, categories, tweets });

  return {
    address,
    chain,
    generatedAt: new Date().toISOString(),
    agent: {
      name: "Hermes",
      status: social.hermesStatus,
      xActionsStatus: social.xActionsStatus,
      summary: socialSummary,
    },
    providerStatus,
    token,
    categories,
    risk,
    article,
    sources: {
      helius: {
        asset: helius.asset,
        supply: helius.supply,
        largestAccounts: helius.largestAccounts,
      },
      dexscreener: {
        pairUrl: stringAt(dexPair, [["url"]]),
        dexId: stringAt(dexPair, [["dexId"]]),
        boosts: numberAt(dexPair, [["boosts", "active"]]),
        rawPair: dexPair,
      },
      birdeye: {
        overview,
        security,
      },
      gmgn,
      social: {
        tweets,
        raw: socialRaw,
      },
    },
  };
}

export async function getTrendingTokens(input: {
  chain?: ScannerChain;
  limit?: number;
} = {}): Promise<TrendingTokensResult> {
  const chain = input.chain ?? "solana";
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);
  const env = getEnv();

  const [birdeyeResult, dexProfiles, gmgn] = await Promise.all([
    birdeyeTrending(chain, limit),
    dexscreenerLatestProfiles(chain, limit),
    getGmgnSignals("", chain),
  ]);

  const seedAddresses = [
    ...birdeyeResult.tokens
      .map((tokenItem) => stringAt(tokenItem, [["address"], ["tokenAddress"]]))
      .filter((value): value is string => Boolean(value)),
    ...dexProfiles.profiles
      .map((profile) => stringAt(profile, [["tokenAddress"]]))
      .filter((value): value is string => Boolean(value)),
  ];
  const addresses = [...new Set(seedAddresses)].slice(0, limit);
  const [dexPairs, securities, heliusResults] = await Promise.all([
    dexscreenerPairs(addresses, chain),
    Promise.all(
      addresses.map(async (tokenAddress) => ({
        address: tokenAddress,
        result: await birdeyeGet("/defi/token_security", tokenAddress, chain),
      })),
    ),
    Promise.all(
      addresses.map(async (tokenAddress) => ({
        address: tokenAddress,
        result: await getHeliusSignals(tokenAddress, chain),
      })),
    ),
  ]);

  const byAddress = new Map<string, TrendingToken>();
  for (const address of addresses) {
    const birdeye = birdeyeResult.tokens.find(
      (tokenItem) => stringAt(tokenItem, [["address"], ["tokenAddress"]]) === address,
    );
    const dexProfile = dexProfiles.profiles.find(
      (profile) => stringAt(profile, [["tokenAddress"]]) === address,
    );
    const dexPair = bestDexPair(dexPairs.pairs, address);
    const security = securities.find((item) => item.address === address)?.result.data;
    const helius = heliusResults.find((item) => item.address === address)?.result;
    byAddress.set(
      address,
      mergeTrendingToken({
        current: byAddress.get(address),
        address,
        chain,
        birdeye,
        dexPair,
        dexProfile,
        security,
        helius,
      }),
    );
  }

  return {
    chain,
    providerStatus: {
      helius: providerStatusFromResults(heliusResults.map((item) => ({ status: item.result.status }))),
      birdeye: birdeyeResult.status,
      dexscreener: dexPairs.status === "ok" || dexProfiles.status === "ok" ? "ok" : "error",
      gmgn: !env.GMGN_API_KEY
        ? "missing_key"
        : gmgn.kolTrades || gmgn.smartMoneyTrades || gmgn.tokenInfo
          ? "ok"
          : "error",
    },
    tokens: [...byAddress.values()]
      .sort((left, right) => {
        if (left.rank !== null && right.rank !== null) return left.rank - right.rank;
        if (left.rank !== null) return -1;
        if (right.rank !== null) return 1;
        return (right.volume24hUsd ?? 0) - (left.volume24hUsd ?? 0);
      })
      .slice(0, limit),
  };
}
