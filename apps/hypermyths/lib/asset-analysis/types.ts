import type { PayShCallStatus } from "@/lib/pay/client";

export type AssetScanProviderStatus = "ok" | "disabled" | "missing_cli" | "error";

export type AssetEvidenceItem = {
  id: string;
  provider: string;
  endpoint: string;
  url: string | null;
  title: string;
  snippet: string;
  raw: unknown | null;
  status: PayShCallStatus;
};

export type AssetOpinion = {
  archetypeId: string;
  archetypeName: string;
  stance: "bullish" | "bearish" | "neutral" | "uncertain";
  confidence: number;
  scores: {
    evidenceQuality: number;
    upside: number;
    downside: number;
    socialMomentum: number;
    falsifiability: number;
    timeSensitivity: number;
  };
  verdict: string;
  catalyst: string;
};

export type AssetAnalysisResult = {
  topic: string;
  normalizedTopic: string;
  generatedAt: string;
  engine: {
    name: "HyperMyths Asset Analysis Engine";
    motoStatus: AssetScanProviderStatus;
    miroSharkStatus: AssetScanProviderStatus;
    payShStatus: AssetScanProviderStatus;
    summary: string;
  };
  providerStatus: {
    paySh: AssetScanProviderStatus;
    webSearch: AssetScanProviderStatus;
    socialSearch: AssetScanProviderStatus;
    inference: AssetScanProviderStatus;
    moto: AssetScanProviderStatus;
    miroShark: AssetScanProviderStatus;
  };
  categories: {
    technical: string[];
    market: string[];
    thesis: string[];
    public: string[];
    prediction: string[];
  };
  risk: {
    score: number;
    label: "Lower" | "Medium" | "High" | "Unknown";
    flags: string[];
  };
  article: {
    title: string;
    summary: string[];
    story: string[];
  };
  moto: {
    roundsRun: number;
    convergenceReason: string;
    acceptedSubmissions: string[];
    rejectedFeedback: string[];
  };
  miroShark: {
    marketPrice: number;
    consensus: Record<string, number>;
    headlineCatalysts: string[];
    opinions: AssetOpinion[];
  };
  sources: {
    payShEndpoints: Array<{
      service: string;
      endpoint: string;
      url: string;
      price: string;
      status: PayShCallStatus;
      notes: string;
    }>;
    evidence: AssetEvidenceItem[];
  };
};
