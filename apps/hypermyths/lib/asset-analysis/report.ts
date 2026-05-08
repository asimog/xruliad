import type { AssetAnalysisResult } from "@/lib/asset-analysis/types";
import type { ReportDocument } from "@/lib/types/domain";

export function fallbackAssetResult(topicInput: string | null, reason: string): AssetAnalysisResult {
  const topic = topicInput?.trim() || "unknown asset";
  return {
    topic,
    normalizedTopic: topic,
    generatedAt: new Date().toISOString(),
    engine: {
      name: "HyperMyths Asset Analysis Engine",
      motoStatus: "error",
      miroSharkStatus: "error",
      payShStatus: "error",
      summary:
        "The asset scanner prepared a limited report because the live research stack was unavailable.",
    },
    providerStatus: {
      paySh: "error",
      webSearch: "error",
      socialSearch: "error",
      inference: "error",
      moto: "error",
      miroShark: "error",
    },
    categories: {
      technical: ["Live source collection did not complete for this scan."],
      market: ["No confident market read is available from this run."],
      thesis: ["The thesis should remain unresolved until fresh sources are available."],
      public: ["Social search did not return verified signals."],
      prediction: ["Rerun the scan before forming a time-boxed prediction."],
    },
    risk: {
      score: 100,
      label: "Unknown",
      flags: [`Limited report: ${reason}`],
    },
    article: {
      title: `Limited asset scan for ${topic}`,
      summary: [
        "The scanner returned a safe fallback report.",
        "Live Pay.sh, MOTO, or MiroShark-style inference did not complete.",
      ],
      story: [
        `${topic} could not be fully analyzed in this run.`,
        "Treat this as uncertainty, not as a positive or negative signal.",
      ],
    },
    moto: {
      roundsRun: 0,
      convergenceReason: "fallback",
      acceptedSubmissions: [],
      rejectedFeedback: [],
    },
    miroShark: {
      marketPrice: 0.5,
      consensus: {},
      headlineCatalysts: [],
      opinions: [],
    },
    sources: {
      payShEndpoints: [],
      evidence: [],
    },
  };
}

export function buildAssetReport(jobId: string, result: AssetAnalysisResult): ReportDocument {
  return {
    jobId,
    wallet: `asset:${result.normalizedTopic.slice(0, 80)}`,
    rangeDays: 1,
    subjectKind: "asset_scan",
    pricingMode: "public",
    visibility: "public",
    experience: "hyperm",
    moderationStatus: "visible",
    subjectAddress: result.normalizedTopic,
    subjectChain: null,
    subjectName: result.normalizedTopic,
    subjectSymbol: null,
    subjectImage: null,
    subjectDescription: result.article.summary.join(" "),
    sourceReference: {
      provider: "Pay.sh",
      url: null,
      embedUrl: null,
      title: "Pay.sh asset scan",
      authorName: null,
      thumbnailUrl: null,
      transcriptExcerpt: JSON.stringify({
        endpointCount: result.sources.payShEndpoints.length,
        evidenceCount: result.sources.evidence.length,
        marketPrice: result.miroShark.marketPrice,
        providerStatus: result.providerStatus,
      }).slice(0, 800),
      referenceMode: "reference_video",
    },
    durationSeconds: 0,
    audioEnabled: false,
    tokenLinks: result.sources.evidence
      .filter((item) => item.url)
      .slice(0, 8)
      .map((item) => ({ label: item.provider, url: item.url as string })),
    marketSnapshot: {
      priceUsd: null,
      marketCapUsd: null,
      liquidityUsd: null,
      volume24hUsd: null,
      pairUrl: null,
    },
    pumpTokensTraded: 0,
    buyCount: 0,
    sellCount: 0,
    solSpent: 0,
    solReceived: 0,
    estimatedPnlSol: 0,
    bestTrade: result.miroShark.marketPrice.toFixed(2),
    worstTrade: result.risk.label,
    styleClassification: `Asset scanner: ${result.risk.label} risk`,
    summary: [
      result.article.title,
      ...result.article.summary,
      result.engine.summary,
      `Risk flags: ${result.risk.flags.join(", ") || "none"}.`,
    ].join("\n\n"),
    timeline: [],
    downloadUrl: null,
    behaviorPatterns: result.categories.technical,
    memorableMoments: result.categories.market,
    funObservations: result.categories.public,
    narrativeSummary: result.article.story.join("\n\n"),
    storyBeats: result.categories.prediction,
  };
}
