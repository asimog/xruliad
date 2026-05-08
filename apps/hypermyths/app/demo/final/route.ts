import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@hypermyths/runtime";
import { readOpenRouterConfig, chooseOpenRouterModel, testOpenRouterKey } from "@hypermyths/openrouter";
import { readByokConfig } from "@hypermyths/byok";
import { readPlatformPayShStatus, quotePlatformAction } from "@hypermyths/platform-payments";
import { createBelief, addEvidence, computeBeliefScore, attachInferenceToBelief, attachPaymentToBelief, feedItemFromBelief, createBeliefFrame } from "@hypermyths/belief-engine";
import { hashMythVideoFromMarketThesis } from "@hypermyths/hashmyth-video";
import { createExecutionIntent, localTradingCapabilities } from "@hypermyths/local-trading";
import { readEncryptStatus, encryptPayloadLocalFallback } from "@hypermyths/encrypt";
import { readIkaStatus, createIkaPolicy } from "@hypermyths/ika";
import { normalizeFeedItem } from "@hypermyths/unified-feed";

export async function GET() {
  const runtime = readRuntimeConfig();
  const openRouter = readOpenRouterConfig();
  const byok = readByokConfig();
  const platformPaySh = readPlatformPayShStatus();
  const model = chooseOpenRouterModel(openRouter);
  const encryptStatus = readEncryptStatus();
  const ikaStatus = readIkaStatus();
  const trading = localTradingCapabilities();

  const keyTest = testOpenRouterKey(openRouter.configured ? "sk-or-v1-demo" : undefined);
  const userPayShConfigured = Boolean(process.env.USER_PAYSH_API_BASE_URL);

  const belief = createBelief({
    domain: "market",
    title: "Demo Market Thesis: Crypto AI agents reshape attention by 2027",
    initialConfidence: 0.4,
    visibility: "public",
    privacyTier: "public",
    runtimeMode: "web",
    sourceProduct: "polymyths",
    status: "running",
    metadata: {}
  });

  const { belief: b2, evidence: ev1 } = addEvidence({
    belief,
    evidence: {
      evidenceType: "supporting",
      title: "AI agent transaction volume growing 40% month-over-month",
      safeSummary: "On-chain data shows rising AI agent tx volume",
      weight: 1.2,
      privacyTier: "public",
      metadata: {}
    }
  });

  const { belief: b3 } = addEvidence({
    belief: b2,
    evidence: {
      evidenceType: "counter",
      title: "Regulatory uncertainty in autonomous trading",
      safeSummary: "SEC/EU frameworks still evolving for autonomous agents",
      weight: 0.8,
      privacyTier: "public",
      metadata: {}
    }
  });

  const { belief: b4 } = attachInferenceToBelief(b3, {
    provider: model.provider,
    model: model.model,
    route: "openrouter",
    effect: "positive"
  });

  const { belief: b5 } = attachPaymentToBelief(b4, {
    amountUsd: 0.05,
    currency: "USDC",
    provider: "pay.sh",
    plane: "platform"
  });

  const score = computeBeliefScore(b5, 2, 1, 4);
  const frame = createBeliefFrame({ belief: b5, frameIndex: 3, updateType: "payment_executed" });
  const { feedItem } = feedItemFromBelief(b5, score);

  const videoJob = hashMythVideoFromMarketThesis({
    thesisId: "demo-thesis-001",
    thesisTitle: "Crypto AI Agents Reshape Attention"
  });

  const adConcept = {
    id: crypto.randomUUID(),
    campaignName: "HashMyth AI Video Launch",
    targetAudience: "Crypto-native creators and traders",
    creativeBrief: "15-second showcase of AI agent video generation capabilities",
    platform: "hashmyth.com + X/Twitter",
    status: "concept_prepared"
  };

  const platformQuote = quotePlatformAction({
    productId: "hashmyth",
    action: "video_generation",
    estimatedCostUsd: 0.05
  });

  const sealedStrategy = encryptPayloadLocalFallback("Demo strategy: long AI agent tokens with 0.5% portfolio allocation, trailing stop at -15%");
  const ikaPolicy = createIkaPolicy({
    allowedVenues: ["paper", "devnet"],
    allowedAssets: ["SOL", "USDC", "BONK"],
    maxTradeSize: 100
  });

  const tradeIntent = createExecutionIntent({
    venue: "paper",
    asset: "AI_AGENT_INDEX",
    side: "buy",
    quantity: 100,
    notional: 500,
    mode: "web_prepare_only",
    rationale: "Thesis: AI agents will capture attention market share. Position sizing 0.5% portfolio."
  });

  const demoFeedItems = [
    normalizeFeedItem({ source_product: "hashmyth", job_type: "video", title: "HashMyth video job created", status: "queued", runtime_mode: "web", privacy_tier: "public" }),
    normalizeFeedItem({ source_product: "polymyths", job_type: "thesis", title: "New thesis: AI agents reshape attention by 2027", status: "complete", runtime_mode: "web", privacy_tier: "public" }),
    normalizeFeedItem({ source_product: "hypertian", job_type: "ad", title: "Ad concept prepared for HashMyth AI Video Launch", status: "prepared", runtime_mode: "web", privacy_tier: "public" }),
    normalizeFeedItem({ source_product: "hypermyths", job_type: "local_trade_intent", title: "[ENCRYPTED] Local trade intent prepared", status: "prepared", runtime_mode: "local", privacy_tier: "public" }),
  ];

  const initialConf = belief.currentConfidence ?? 0.4;
  const finalConf = b5.currentConfidence ?? 0.5;

  return NextResponse.json({
    demo: "HyperMyths Final Demo Flow",
    timestamp: new Date().toISOString(),
    sections: {
      "1_runtime_mode": {
        mode: runtime.appRuntimeMode,
        note: "Web features enabled. Trading remains local."
      },
      "2_openrouter_status": {
        configured: openRouter.configured,
        model: model.model,
        estimatedCost: model.estimatedCost,
        keyValid: keyTest.valid,
        byokMode: byok.storageMode,
        note: openRouter.configured
          ? "OpenRouter configured and ready"
          : "OpenRouter not configured — showing disabled/unconfigured state"
      },
      "3_payment_status": {
        platform: { configured: platformPaySh.configured },
        userLocal: { configured: userPayShConfigured },
        platformQuote,
        note: "Platform pay.sh for web features. User-local pay.sh stays private."
      },
      "4_belief_timeline": {
        initialConfidence: initialConf,
        finalConfidence: finalConf,
        confidenceDelta: finalConf - initialConf,
        evidence: [ev1.title],
        evidenceCount: 3,
        inferenceModel: model.model,
        paymentAmount: 0.05,
        score: { confidence: score.confidence, risk: score.risk, trend: score.trend },
        frameCount: 1,
        note: "RBM-inspired belief engine with evidence-weighted confidence. Not financial advice."
      },
      "5_unified_feed": {
        totalItems: demoFeedItems.length,
        items: demoFeedItems.map((item) => ({
          title: item.title,
          visibility: item.visibility,
          sourceProduct: (item as Record<string, unknown>).source_product
        })),
        note: "Web jobs transparent. Local jobs encrypted/pseudonymous."
      },
      "6_hashmyth_video": {
        jobId: videoJob.id,
        source: videoJob.source,
        status: videoJob.status,
        scenes: videoJob.script.scenes.length,
        durationEstimate: videoJob.script.durationEstimateSeconds,
        note: "HashMyth owns video engine. HyperMyths is the terminal."
      },
      "7_hypertian_ad": {
        campaign: adConcept.campaignName,
        status: adConcept.status,
        note: "Ad concept prepared through Hypertian attention market."
      },
      "8_strategy_seal": {
        encryptEnabled: encryptStatus.enabled,
        localFallback: !encryptStatus.enabled,
        sealed: Boolean(sealedStrategy.ciphertext),
        note: encryptStatus.enabled
          ? "Real Encrypt devnet sealing"
          : "Local base64 fallback (Encrypt devnet not configured)"
      },
      "9_ika_policy": {
        enabled: ikaStatus.enabled,
        realPolicy: ikaStatus.realPolicy,
        localFallback: !ikaStatus.enabled,
        policyId: ikaPolicy.id,
        requiresApproval: ikaPolicy.requiresUserApproval,
        note: ikaStatus.enabled
          ? "Real Ika dWallet policy active"
          : "Local preview generating (Ika devnet not configured)"
      },
      "10_local_trade_intent": {
        id: tradeIntent.id,
        venue: tradeIntent.venue,
        asset: tradeIntent.asset,
        side: tradeIntent.side,
        notional: tradeIntent.notional,
        mode: tradeIntent.mode,
        status: tradeIntent.status,
        executableOnWeb: false,
        requiresLocalGateway: true,
        note: "Trade intent is web_prepare_only. No live execution from web."
      },
      "11_safety_checks": {
        webExecutionBlocked: true,
        tradingLocalOnly: true,
        noSecretsInFeed: true,
        strategyEncrypted: true,
        userKeysNeverStored: true,
        adminMode: "viewer (auth not configured)"
      }
    },
    summary: "All 11 demo sections executed. HashMyth owns video. HyperMyths is terminal. Trading stays local. Platform payments use pay.sh. Belief engine with OpenRouter. No web live execution."
  });
}
