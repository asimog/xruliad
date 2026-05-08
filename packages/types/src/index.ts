import type { ProductId } from "@hypermyths/theme";
export type { ProductId } from "@hypermyths/theme";

export type ID = string;

export type Product = {
  id: ProductId;
  name: string;
  domain: string;
};

export type User = {
  id: ID;
  walletAddress?: string;
  profileUrl?: string;
  productId?: ProductId;
};

export type EvidenceSource = {
  id: ID;
  title: string;
  url?: string;
  sourceType: "web" | "wallet" | "social" | "paper" | "simulation" | "market" | "manual";
  retrievedAt?: string;
  confidence?: number;
};

export type MarketSignal = {
  id: ID;
  productId: ProductId;
  label: string;
  summary: string;
  direction: "bullish" | "bearish" | "neutral" | "mixed" | "unknown";
  strength: number;
  evidence: EvidenceSource[];
};

export type ResearchQuest = {
  id: ID;
  productId: "cancerhawk" | "hyperkaon";
  title: string;
  prompt: string;
  reward?: string;
  safetyNotes?: string[];
  evidence: EvidenceSource[];
};

export type SimulationScenario = {
  id: ID;
  productId: ProductId;
  title: string;
  seed: string;
  populationSize: number;
  timelineHours: number;
  inputs: EvidenceSource[];
};

export type ScenarioOutcome = {
  id: ID;
  scenarioId: ID;
  summary: string;
  sentimentTrajectory?: Array<{ hour: number; score: number }>;
  marketTrajectory?: Array<{ hour: number; price: number }>;
  risks: string[];
  opportunities: string[];
};

export type PredictionThesis = {
  id: ID;
  productId: ProductId;
  title: string;
  thesis: string;
  horizon: string;
  confidence: number;
  signals: MarketSignal[];
};

export type VideoScript = {
  id: ID;
  productId: ProductId;
  title: string;
  hook: string;
  narration: string[];
  shotList: Array<{ scene: string; visualPrompt: string; durationSeconds?: number }>;
  captions: string[];
};

export type IntelligenceReport = {
  id: ID;
  productId: ProductId;
  title: string;
  summary: string;
  reportType: "market" | "cancer_research" | "physics_research" | "video_script" | "scenario";
  signals: MarketSignal[];
  quests?: ResearchQuest[];
  theses?: PredictionThesis[];
  scenarios?: ScenarioOutcome[];
  videoScripts?: VideoScript[];
  evidence: EvidenceSource[];
  createdAt: string;
};

export type AgentRun = {
  id: ID;
  productId: ProductId;
  workflow: string;
  status: "queued" | "running" | "complete" | "failed";
  costUsd?: number;
  inputDigest?: string;
  outputDigest?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type PaidApiCall = {
  id: ID;
  provider: string;
  url: string;
  productId: ProductId;
  status: "quoted" | "paid" | "complete" | "failed" | "blocked";
  quotedCostUsd?: number;
  paidCostUsd?: number;
  error?: string;
  createdAt: string;
};

export type SimulationRun = {
  id: ID;
  productId: ProductId;
  scenario: SimulationScenario;
  status: "queued" | "running" | "complete" | "failed";
  outcome?: ScenarioOutcome;
  rawRunId?: string;
  error?: string;
};

export type Quest = ResearchQuest;
export type Market = { id: ID; productId: ProductId; title: string; marketType: "attention" | "research" | "prediction" | "compute" };
export type Prediction = PredictionThesis;
export type Simulation = SimulationRun;
export type Campaign = { id: ID; productId: "hypertian"; title: string; streamUrl?: string; budget?: string };
export type TokenProfile = { address: string; chain: string; symbol?: string; name?: string; imageUrl?: string };
export type WalletProfile = { address: string; chain: string; labels?: string[]; riskNotes?: string[] };
