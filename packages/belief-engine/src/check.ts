import { readBeliefConfig, createBelief, addEvidence, computeBeliefScore, createBeliefFrame, feedItemFromBelief, createBeliefUpdate, attachInferenceToBelief } from "./index.js";

const config = readBeliefConfig();
const belief = createBelief({ domain: "market", title: "Test market thesis", initialConfidence: 0.4, visibility: "public", privacyTier: "public", runtimeMode: "web", sourceProduct: "hypermyths", status: "draft", metadata: {} });

const { belief: b2, evidence } = addEvidence({ belief, evidence: { evidenceType: "supporting", title: "Market data", safeSummary: "Supporting odds data", weight: 1.5, privacyTier: "public", metadata: {} } });
const { belief: b3, evidence: ev2 } = addEvidence({ belief: b2, evidence: { evidenceType: "counter", title: "Liquidity concerns", safeSummary: "Thin orderbook", weight: 0.8, privacyTier: "public", metadata: {} } });

const score = computeBeliefScore(b3, 1, 1, 2);
const frame = createBeliefFrame({ belief: b3, frameIndex: 1, updateType: "evidence_added" });
const { feedItem } = feedItemFromBelief(b3, score);

const { belief: b4, update: inf } = attachInferenceToBelief(b3, { provider: "openrouter", model: "openrouter/free", route: "free-tier", effect: "positive" });

console.log(JSON.stringify({ config, initialConfidence: belief.currentConfidence, afterEvidence: b2.currentConfidence, afterCounter: b3.currentConfidence, afterInference: b4.currentConfidence, score, frame: { title: frame.title, confidence: frame.confidence }, feedItem: { title: feedItem.title, safeSummary: feedItem.safe_summary, visibility: feedItem.visibility }, inferenceUpdate: inf.safeSummary }, null, 2));
