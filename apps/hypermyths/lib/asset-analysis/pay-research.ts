import { getEnv } from "@/lib/env";
import { PAY_SH_ENDPOINTS, getPayShEndpoint, payShEndpointUrl, type PayShEndpointId } from "@/lib/pay/catalog";
import { payShPostJson } from "@/lib/pay/client";
import { spendPaySh } from "@/lib/pay/intermediary";
import type { AssetEvidenceItem } from "./types";

const DEFAULT_RESEARCH_ENDPOINTS: PayShEndpointId[] = [
  "perplexity_search",
  "stableenrich_exa_answer",
  "stableenrich_exa_search",
  "stableenrich_serper_news",
  "stableenrich_reddit_search",
  "stablesocial_tiktok_search",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(value: unknown, keys: string[]): string | null {
  const record = asRecord(value);
  for (const key of keys) {
    const found = record[key];
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return null;
}

function arrayCandidates(data: unknown): unknown[] {
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const result = asRecord(record.result);
  const candidates = [
    record.results,
    record.organic,
    record.news,
    record.posts,
    record.items,
    nested.results,
    nested.organic,
    nested.news,
    nested.posts,
    nested.items,
    result.results,
    result.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return data ? [data] : [];
}

function evidenceFromPayload(input: {
  endpointId: PayShEndpointId;
  provider: string;
  endpointUrl: string;
  status: AssetEvidenceItem["status"];
  data: unknown;
}): AssetEvidenceItem[] {
  return arrayCandidates(input.data)
    .map((item, index): AssetEvidenceItem | null => {
      const record = asRecord(item);
      const title =
        firstString(record, ["title", "name", "headline", "question", "url"]) ??
        `${input.provider} result ${index + 1}`;
      const snippet =
        firstString(record, ["snippet", "summary", "content", "text", "answer", "description"]) ??
        JSON.stringify(record).slice(0, 500);
      return {
        id: `${input.endpointId}-${index}`,
        provider: input.provider,
        endpoint: input.endpointId,
        url: firstString(record, ["url", "link", "permalink"]),
        title,
        snippet,
        raw: item,
        status: input.status,
      };
    })
    .filter((item): item is AssetEvidenceItem => Boolean(item))
    .slice(0, 8);
}

function bodyForEndpoint(endpointId: PayShEndpointId, topic: string) {
  if (endpointId === "perplexity_sonar") {
    return {
      messages: [
        {
          role: "user",
          content: `Research this topic with citations and conflicting evidence: ${topic}`,
        },
      ],
    };
  }

  if (endpointId === "stableenrich_exa_answer") {
    return { query: `What are the strongest current signals, risks, and predictions for ${topic}?` };
  }

  return {
    query: topic,
    q: topic,
    keyword: topic,
    maxResults: 5,
    limit: 5,
  };
}

export async function collectPayShEvidence(topic: string, jobId?: string) {
  const env = getEnv();
  const endpointIds = DEFAULT_RESEARCH_ENDPOINTS.slice(
    0,
    env.PAY_SH_MAX_CALLS || DEFAULT_RESEARCH_ENDPOINTS.length,
  );

  const calls = await Promise.all(
    endpointIds.map(async (endpointId) => {
      const endpoint = getPayShEndpoint(endpointId);
      const body = bodyForEndpoint(endpointId, topic);
      const result = jobId
        ? await spendPaySh({ jobId, endpointId, body })
        : await payShPostJson(endpointId, body);
      return {
        endpoint,
        result,
        evidence: evidenceFromPayload({
          endpointId,
          provider: endpoint.label,
          endpointUrl: payShEndpointUrl(endpoint),
          status: result.status,
          data: result.data,
        }),
      };
    }),
  );

  const endpointSummaries = PAY_SH_ENDPOINTS.map((endpoint) => ({
    service: endpoint.service,
    endpoint: endpoint.path,
    url: payShEndpointUrl(endpoint),
    price: endpoint.price,
    status:
      calls.find((call) => call.endpoint.id === endpoint.id)?.result.status ?? "disabled",
    notes: endpoint.notes,
  }));

  return {
    endpoints: endpointSummaries,
    evidence: calls.flatMap((call) => call.evidence).slice(0, 24),
    statuses: calls.map((call) => call.result.status),
  };
}
