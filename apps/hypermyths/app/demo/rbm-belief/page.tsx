import { createBelief, addEvidence, computeBeliefScore, createBeliefFrame, attachInferenceToBelief, attachPaymentToBelief, createBeliefArtifact } from "@hypermyths/belief-engine";
import { readOpenRouterConfig, chooseOpenRouterModel } from "@hypermyths/openrouter";
import { quotePlatformAction } from "@hypermyths/platform-payments";
import { createThesis } from "@hypermyths/thesis-engine";
import { prepareAdCampaign } from "@hypermyths/ads";
import { prepareHashMythVideo } from "@hypermyths/hashmyth-video";
import { createExecutionIntent } from "@hypermyths/local-trading";
import { encryptPayloadLocalFallback } from "@hypermyths/encrypt";

export default function RbmBeliefDemoPage() {
  const orConfig = readOpenRouterConfig();
  const model = chooseOpenRouterModel(orConfig);

  const thesis = createThesis({ productId: "polymyths", type: "market", title: "Market mispricing hypothesis", claim: "This prediction market is misaligned with fundamentals due to recent sentiment shock.", visibility: "public" });

  const belief = createBelief({ domain: "market", title: thesis.title, initialConfidence: 0.35, visibility: "public", privacyTier: "public", runtimeMode: "web", sourceProduct: "polymyths", thesisId: thesis.id, status: "draft", metadata: {} });

  const { belief: b2, evidence: ev1 } = addEvidence({ belief, evidence: { evidenceType: "supporting", title: "Order book imbalance", safeSummary: "Buy side is 2x the sell side depth", weight: 1.2, privacyTier: "public", metadata: { source: "on-chain data" } } });
  const { belief: b3, evidence: ev2 } = addEvidence({ belief: b2, evidence: { evidenceType: "counter", title: "Declining volume", safeSummary: "30-day volume trend is negative", weight: 0.8, privacyTier: "public", metadata: { source: "dex analytics" } } });

  const { belief: b4, update: infUpdate } = attachInferenceToBelief(b3, { provider: model.provider, model: model.model, route: "openrouter", effect: "positive", costUsd: 0 });

  const payQuote = quotePlatformAction({ productId: "polymyths", action: "premium_intelligence", estimatedCostUsd: 0.05 });
  const { belief: b5, update: payUpdate } = attachPaymentToBelief(b4, { amountUsd: payQuote.estimatedCostUsd, currency: payQuote.currency, provider: "pay.sh", plane: "platform" });

  const score = computeBeliefScore(b5, 2, 1, 4);
  const frame = createBeliefFrame({ belief: b5, frameIndex: 4, updateType: "payment_executed" });

  const videoArtifact = prepareHashMythVideo({ title: thesis.title, sourcePrompt: thesis.claim, source: "market_thesis" });
  const adArtifact = prepareAdCampaign({ thesisId: thesis.id, title: "Transparent thesis ad", sponsor: "HyperMyths demo", concept: "Sponsor metadata visible." });
  const tradeIntent = createExecutionIntent({ thesisId: thesis.id, venue: "paper", asset: thesis.title, side: "simulate", rationale: "Prepared only — local execution gateway required." });
  const encrypt = encryptPayloadLocalFallback(thesis.claim);

  const beliefArtifacts = [
    createBeliefArtifact({ beliefId: b5.id, artifactType: "video_script", artifactId: videoArtifact.id, metadata: { hashmyth: true } }),
    createBeliefArtifact({ beliefId: b5.id, artifactType: "ad_concept", artifactId: adArtifact.id, metadata: { hypertian: true } }),
    createBeliefArtifact({ beliefId: b5.id, artifactType: "trade_intent", artifactId: tradeIntent.id, metadata: { localOnly: true } })
  ];

  const confidenceTimeline = [
    { label: "Initial", confidence: belief.currentConfidence ?? 0, desc: "Belief created" },
    { label: "+Evidence", confidence: b2.currentConfidence ?? 0, desc: "Supporting" },
    { label: "+Counter", confidence: b3.currentConfidence ?? 0, desc: "Counterevidence" },
    { label: "+Inference", confidence: b4.currentConfidence ?? 0, desc: "Model run" },
    { label: "+Payment", confidence: b5.currentConfidence ?? 0, desc: "pay.sh" }
  ];

  const summaryJson = JSON.stringify({
    thesis: thesis.title,
    confidenceTimeline,
    finalScore: { confidence: score.confidence, risk: score.risk, trend: score.trend, evidenceCount: score.evidenceCount, counterEvidenceCount: score.counterEvidenceCount, updateCount: score.updateCount },
    inference: { model: model.model, estimatedCost: model.estimatedCost, update: infUpdate.safeSummary },
    payment: { action: payQuote.action, estimatedCostUsd: payQuote.estimatedCostUsd, currency: payQuote.currency, publicReceipt: payQuote.publicReceipt, update: payUpdate.safeSummary },
    artifacts: {
      hashmythVideo: { id: videoArtifact.id, title: videoArtifact.script.title },
      hypertianAd: { id: adArtifact.id, sponsor: adArtifact.sponsor },
      localTradeIntent: { id: tradeIntent.id, mode: tradeIntent.mode, liveExecutionFromWeb: false },
      encrypt: { sealed: Boolean(encrypt.id) },
      beliefArtifacts: beliefArtifacts.map(function (a) { return { type: a.artifactType, id: a.artifactId }; })
    },
    frame: { title: frame.title, confidence: frame.confidence, status: frame.status }
  }, null, 2);

  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px", color: "#effffb", background: "#050807" }}>
      <section style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 44, letterSpacing: 0 }}>RBM-Inspired Belief Demo</h1>
        <p style={{ color: "#b8d7d0" }}>
          Visible learning loop: create a thesis, gather evidence, route inference, pay via pay.sh, update confidence over time, produce artifacts.
        </p>
        <p style={{ color: "#b8d7d0", fontStyle: "italic", marginTop: 8 }}>
          Not ML — practical progress tracking inspired by the idea of visible belief updates.
        </p>
        <pre style={{ overflow: "auto", padding: 20, borderRadius: 8, border: "1px solid rgba(124,228,210,.24)", background: "rgba(4,16,14,.72)", fontSize: 13, marginTop: 24 }}>
          {summaryJson}
        </pre>
        <p style={{ marginTop: 24, color: "#b8d7d0", fontSize: 14 }}>
          This is an RBM-inspired belief engine, not actual ML. It tracks how a structured hypothesis changes over time as evidence, inference, paid APIs, and simulations are added. The goal is visible progress, not machine learning.
        </p>
      </section>
    </main>
  );
}
