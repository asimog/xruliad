import Fastify from "fastify";
import { readRuntimeConfig } from "@hypermyths/runtime";
import { readOpenRouterConfig, chooseOpenRouterModel, testOpenRouterKey, createChatCompletion } from "@hypermyths/openrouter";
import { createBelief, addEvidence, computeBeliefScore, createBeliefFrame, attachInferenceToBelief, feedItemFromBelief, readBeliefConfig } from "@hypermyths/belief-engine";
import { productHealth, productCapabilities, prepareAgentExecution } from "@hypermyths/product-api";
import { normalizeFeedItem } from "@hypermyths/unified-feed";
import { prepareHashMythVideo, quoteHashMythVideo, readHashMythVideoCapabilities } from "@hypermyths/hashmyth-video";
import { quotePlatformAction, createPlatformReceipt } from "@hypermyths/platform-payments";
import { quoteUserLocalRequest } from "@hypermyths/user-local-payments";
import { createExecutionIntent, localTradingCapabilities, type ExecutionIntent } from "@hypermyths/local-trading";
import { readByokConfig, validateKeyForStorage } from "@hypermyths/byok";
import type { ProductId } from "@hypermyths/theme";

const port = Number(process.env.PORT ?? 4200);
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  const runtime = readRuntimeConfig();
  return { ok: true, service: "hermes-worker", runtime: runtime.appRuntimeMode, timestamp: new Date().toISOString() };
});

app.get("/capabilities", async () => {
  const runtime = readRuntimeConfig();
  const or = readOpenRouterConfig();
  const video = readHashMythVideoCapabilities();
  const trading = localTradingCapabilities();
  return {
    service: "hermes-worker",
    runtime: runtime.appRuntimeMode,
    features: {
      openRouter: or.configured,
      videoEngine: video.rendererConfigured,
      payShPlatform: Boolean(process.env.PLATFORM_PAYSH_API_BASE_URL),
      payShUserLocal: Boolean(process.env.USER_PAYSH_API_BASE_URL),
      tradingMode: trading.defaultMode,
      supabase: Boolean(process.env.SUPABASE_URL)
    },
    endpoints: [
      "GET /health",
      "GET /capabilities",
      "POST /agent/run",
      "POST /commands", "GET /commands/:id", "POST /commands/:id/run", "POST /commands/:id/contribute",
      "POST /theses", "GET /theses/:id", "POST /theses/:id/run", "POST /theses/:id/contribute",
      "POST /beliefs", "GET /beliefs/:id", "POST /beliefs/:id/run", "POST /beliefs/:id/evidence", "GET /beliefs/:id/timeline",
      "POST /jobs", "GET /jobs/:id",
      "GET /feed", "POST /feed", "POST /feed/events", "POST /feed/:id/moderate",
      "POST /video/jobs", "POST /ads/jobs", "POST /research/jobs", "POST /intelligence/jobs", "POST /simulation/jobs",
      "POST /payments/quote", "POST /payments/execute",
      "GET /admin/overview", "GET /admin/agent-runs", "GET /admin/feed"
    ]
  };
});

app.post("/agent/run", async (request, reply) => {
  const body = request.body as Record<string, unknown> ?? {};
  const productId = (body.productId as ProductId) ?? "hypermyths";
  const result = prepareAgentExecution({ productId, toolId: String(body.toolId ?? "agent.run"), input: body.input ?? body });
  return result;
});

app.post("/commands", async () => ({
  id: crypto.randomUUID(),
  status: "created",
  message: "Command creation placeholder — Supabase persistence pending"
}));

app.get("/commands/:id", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "pending",
  message: "Command status placeholder"
}));

app.post("/commands/:id/run", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "running",
  message: "Command run placeholder"
}));

app.post("/commands/:id/contribute", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "contribution_received",
  message: "Contribution placeholder"
}));

app.post("/theses", async () => ({
  id: crypto.randomUUID(),
  status: "created",
  message: "Thesis creation placeholder"
}));

app.get("/theses/:id", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "draft",
  message: "Thesis status placeholder"
}));

app.post("/theses/:id/run", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "running",
  message: "Thesis run placeholder"
}));

app.post("/theses/:id/contribute", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "contribution_received",
  message: "Thesis contribution placeholder"
}));

app.post("/beliefs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  const belief = createBelief({
    domain: (body.domain as never) ?? "market",
    title: String(body.title ?? "New Belief"),
    initialConfidence: Number(body.initialConfidence ?? 0.5),
    visibility: (body.visibility as never) ?? "public",
    privacyTier: (body.privacyTier as never) ?? "public",
    runtimeMode: "web",
    sourceProduct: (body.sourceProduct as string) ?? "polymyths",
    status: "draft",
    metadata: {}
  });
  return belief;
});

app.get("/beliefs/:id", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "running",
  message: "Belief status placeholder"
}));

app.post("/beliefs/:id/run", async (request) => {
  const id = (request.params as { id: string }).id;
  const body = request.body as Record<string, unknown> ?? {};
  const belief = createBelief({
    domain: "general_intelligence",
    title: String(body.title ?? "Runtime Belief"),
    initialConfidence: 0.5,
    visibility: "public",
    privacyTier: "public",
    runtimeMode: "web",
    sourceProduct: "polymyths",
    status: "running",
    metadata: {}
  });

  const openRouter = readOpenRouterConfig();
  if (openRouter.configured) {
    try {
      const completion = await createChatCompletion({
        model: openRouter.defaultModel,
        messages: [
          { role: "system", content: "You analyze belief confidence based on evidence." },
          { role: "user", content: String(body.prompt ?? "Analyze this belief") }
        ]
      });
      const { belief: updated } = attachInferenceToBelief(belief, {
        provider: "openrouter",
        model: completion.model,
        route: "openrouter",
        effect: "positive"
      });
      const score = computeBeliefScore(updated, 1, 0, 2);
      const { feedItem } = feedItemFromBelief(updated, score);
      return { id, belief: updated, score, feedItem };
    } catch (err) {
      return { id, error: `Inference failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  const score = computeBeliefScore(belief, 1, 0, 2);
  const { feedItem } = feedItemFromBelief(belief, score);
  return { id, belief, score, feedItem, note: "OpenRouter not configured — using local scoring only" };
});

app.post("/beliefs/:id/evidence", async (request) => {
  const id = (request.params as { id: string }).id;
  const body = request.body as Record<string, unknown> ?? {};
  const belief = createBelief({
    domain: "market",
    title: String(body.title ?? "Evidence Check"),
    initialConfidence: 0.5,
    visibility: "public",
    privacyTier: "public",
    runtimeMode: "web",
    sourceProduct: "polymyths",
    status: "running",
    metadata: {}
  });
  const result = addEvidence({
    belief,
    evidence: {
      evidenceType: (body.evidenceType as never) ?? "supporting",
      title: String(body.evidenceTitle ?? "New Evidence"),
      safeSummary: String(body.safeSummary ?? body.evidenceTitle ?? ""),
      weight: Number(body.weight ?? 1),
      privacyTier: "public",
      metadata: {}
    }
  });
  const score = computeBeliefScore(result.belief, 1, 0, 2);
  const { feedItem } = feedItemFromBelief(result.belief, score);
  return { id, belief: result.belief, evidence: result.evidence, score, feedItem };
});

app.get("/beliefs/:id/timeline", async (request) => {
  const id = (request.params as { id: string }).id;
  const belief = createBelief({
    domain: "market",
    title: "Timeline Belief",
    initialConfidence: 0.5,
    visibility: "public",
    privacyTier: "public",
    runtimeMode: "web",
    sourceProduct: "polymyths",
    status: "running",
    metadata: {}
  });
  const frame = createBeliefFrame({ belief, frameIndex: 0, updateType: "evidence_added" });
  return { id, timeline: [frame], belief };
});

app.post("/jobs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return { id: crypto.randomUUID(), status: "queued", input: body, createdAt: new Date().toISOString() };
});

app.get("/jobs/:id", async (request) => ({
  id: (request.params as { id: string }).id,
  status: "queued",
  createdAt: new Date().toISOString()
}));

app.get("/feed", async () => {
  const items = ["video", "intelligence", "thesis"].map((t) =>
    normalizeFeedItem({
      source_product: "hashmyth",
      job_type: t as never,
      title: `${t} feed item`,
      status: "complete",
      runtime_mode: "web",
      privacy_tier: "public"
    })
  );
  return { feed: items, count: items.length };
});

app.post("/feed", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return normalizeFeedItem({
    source_product: (body.source_product as never) ?? "hypermyths",
    job_type: (body.job_type as never) ?? "thesis",
    title: String(body.title ?? "Feed Item"),
    status: "queued",
    runtime_mode: "web",
    privacy_tier: "public"
  });
});

app.post("/feed/events", async () => ({
  id: crypto.randomUUID(),
  event_type: "job_queued",
  message: "Feed event placeholder"
}));

app.post("/feed/:id/moderate", async (request) => ({
  id: (request.params as { id: string }).id,
  action: "approved",
  message: "Moderation placeholder"
}));

app.post("/video/jobs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  const job = prepareHashMythVideo({
    title: String(body.title ?? "Hermes Video Job"),
    sourcePrompt: String(body.sourcePrompt ?? body.prompt ?? ""),
    source: (body.source as never) ?? "prompt",
    inputPayload: body.inputPayload as Record<string, unknown> ?? body
  });
  return quoteHashMythVideo(job);
});

app.post("/ads/jobs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return { id: crypto.randomUUID(), status: "queued", type: "ad_campaign", input: body, createdAt: new Date().toISOString() };
});

app.post("/research/jobs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return { id: crypto.randomUUID(), status: "queued", type: "research_quest", input: body, createdAt: new Date().toISOString() };
});

app.post("/intelligence/jobs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return { id: crypto.randomUUID(), status: "queued", type: "intelligence", input: body, createdAt: new Date().toISOString() };
});

app.post("/simulation/jobs", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return { id: crypto.randomUUID(), status: "queued", type: "simulation", input: body, createdAt: new Date().toISOString() };
});

app.post("/payments/quote", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  if (body.paymentPlane === "user_local") {
    return quoteUserLocalRequest({ estimatedCostUsd: Number(body.estimatedCostUsd ?? 0) });
  }
  return quotePlatformAction({
    productId: (body.productId as never) ?? "hashmyth",
    action: (body.action as never) ?? "video_generation",
    estimatedCostUsd: Number(body.estimatedCostUsd ?? 0)
  });
});

app.post("/payments/execute", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  if (body.paymentPlane === "user_local") {
    return { status: "requires_setup", message: "User-local payment execution requires local gateway" };
  }
  const quote = quotePlatformAction({
    productId: (body.productId as never) ?? "hashmyth",
    action: (body.action as never) ?? "video_generation",
    estimatedCostUsd: Number(body.estimatedCostUsd ?? 0)
  });
  return createPlatformReceipt(quote, true);
});

app.get("/admin/overview", async () => {
  const runtime = readRuntimeConfig();
  const or = readOpenRouterConfig();
  return {
    service: "hermes-worker",
    runtime: runtime.appRuntimeMode,
    openRouterConfigured: or.configured,
    platformPayShConfigured: Boolean(process.env.PLATFORM_PAYSH_API_BASE_URL),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    executionMode: "web_prepare_only",
    timestamp: new Date().toISOString()
  };
});

app.get("/admin/agent-runs", async () => ({
  runs: [],
  count: 0,
  message: "Agent runs placeholder — Supabase persistence pending"
}));

app.get("/admin/feed", async () => ({
  feed: [],
  count: 0,
  filters: ["all", "pending", "approved", "hidden", "flagged"],
  message: "Admin feed placeholder — Supabase persistence pending"
}));

app.post("/admin/feed/:id/:action", async (request) => {
  const params = request.params as { id: string; action: string };
  return { id: params.id, action: params.action, status: "processed" };
});

app.post("/admin/settings", async (request) => ({
  message: "Settings placeholder"
}));

app.get("/admin/wallets", async () => ({
  wallets: [],
  count: 0
}));

app.post("/admin/wallets/spawn-intent", async () => ({
  id: crypto.randomUUID(),
  status: "intent_created",
  requiresLocalSigning: true
}));

app.post("/setup/openrouter/test", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  const key = String(body.key ?? process.env.OPENROUTER_API_KEY ?? "");
  const result = testOpenRouterKey(key);
  return {
    ...result,
    redactedKey: key ? key.slice(0, 6) + "..." + (key.length > 8 ? key.slice(-4) : "") : "[no key]"
  };
});

app.post("/setup/paysh/test", async () => ({
  platformConfigured: Boolean(process.env.PLATFORM_PAYSH_API_BASE_URL),
  userLocalConfigured: Boolean(process.env.USER_PAYSH_API_BASE_URL),
  message: Boolean(process.env.PLATFORM_PAYSH_API_BASE_URL)
    ? "Platform pay.sh endpoint configured"
    : "Platform pay.sh not configured"
}));

app.post("/video/from-thesis", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  return prepareHashMythVideo({
    title: String(body.title ?? "Thesis Video"),
    sourcePrompt: String(body.prompt ?? body.sourcePrompt ?? ""),
    source: "market_thesis",
    inputPayload: body
  });
});

app.get("/trading/capabilities", async () => ({
  ...localTradingCapabilities(),
  executionMode: "web_prepare_only",
  localOnly: true
}));

app.post("/trading/intent", async (request) => {
  const body = request.body as Record<string, unknown> ?? {};
  const venue = String(body.venue ?? "paper") as ExecutionIntent["venue"];
  const side = String(body.side ?? "buy") as ExecutionIntent["side"];
  return createExecutionIntent({
    venue,
    asset: String(body.asset ?? "UNKNOWN"),
    side,
    quantity: Number(body.quantity ?? 0),
    notional: Number(body.notional ?? 0),
    mode: "web_prepare_only",
    rationale: String(body.rationale ?? "")
  });
});

const start = async () => {
  try {
    await app.listen({ port, host });
    console.log(`[hermes-worker] running on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
