import { createBelief, addEvidence, computeBeliefScore, createBeliefFrame, attachInferenceToBelief, attachPaymentToBelief, feedItemFromBelief, readBeliefConfig } from "@hypermyths/belief-engine";
import { readOpenRouterConfig, chooseOpenRouterModel, testOpenRouterKey } from "@hypermyths/openrouter";
import { readByokConfig, validateKeyForStorage } from "@hypermyths/byok";
import { readRuntimeConfig } from "@hypermyths/runtime";

const runtime = readRuntimeConfig();
const beliefConfig = readBeliefConfig();
const openRouter = readOpenRouterConfig();
const byok = readByokConfig();

const belief = createBelief({ domain: "market", title: "Example Market Thesis", initialConfidence: 0.35, visibility: "public", privacyTier: "public", runtimeMode: "web", sourceProduct: "polymyths", status: "draft", metadata: {} });

const { belief: b2, evidence: ev1 } = addEvidence({ belief, evidence: { evidenceType: "supporting", title: "Order book imbalance", safeSummary: "Buy side deeper", weight: 1.2, privacyTier: "public", metadata: {} } });
const { belief: b3, evidence: ev2 } = addEvidence({ belief: b2, evidence: { evidenceType: "counter", title: "Volume declining", safeSummary: "30-day volume trend down", weight: 0.9, privacyTier: "public", metadata: {} } });

const model = chooseOpenRouterModel(openRouter);
const { belief: b4, update: infUpdate } = attachInferenceToBelief(b3, { provider: model.provider, model: model.model, route: "openrouter", effect: "positive" });

const { belief: b5, update: payUpdate } = attachPaymentToBelief(b4, { amountUsd: 0.05, currency: "USDC", provider: "pay.sh", plane: "platform" });

const score = computeBeliefScore(b5, 2, 1, 4);
const frame = createBeliefFrame({ belief: b5, frameIndex: 3, updateType: "payment_executed" });
const { feedItem } = feedItemFromBelief(b5, score);

const buyokTest = testOpenRouterKey(openRouter.configured ? "sk-or-v1-demo" : undefined);
const keyValidation = validateKeyForStorage(byok.storageMode, "sk-or-v1-demo");

console.log(JSON.stringify({
  service: "hermes-worker",
  runtime: runtime.appRuntimeMode,
  belief: { title: belief.title, initialConfidence: belief.currentConfidence, finalConfidence: b5.currentConfidence, status: b5.status },
  evidence: [ev1.title, ev2.title],
  inference: { model: model.model, cost: model.estimatedCost },
  payment: { amountUsd: 0.05 },
  finalScore: { confidence: score.confidence, risk: score.risk, trend: score.trend },
  feedItem: { title: feedItem.title, visibility: feedItem.visibility },
  byok: { configured: openRouter.configured, storageMode: byok.storageMode, keyTest: { valid: buyokTest.valid, message: buyokTest.message }, keyValidated: keyValidation.allowed }
}, null, 2));
