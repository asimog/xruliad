import { getProduct, type ProductId } from "@hypermyths/theme";

export type RuntimeSupport = "web" | "local" | "hybrid";
export type PaymentPlane = "platform" | "user_local" | "free";
export type ToolPermission = "public" | "authenticated" | "agent" | "local_pairing" | "admin";
export type LocalOnlyRestriction = "trading_execution" | "user_trading_keys" | "user_local_payments" | "private_strategy" | "none";
export type PublicDisplayPermission = "public" | "permissioned" | "private";

export type ToolCostEstimate = { paymentPlane: PaymentPlane; estimatedCostUsd?: number; requiresQuote: boolean };
export type AgentTool = { id: string; label: string; permission: ToolPermission; cost: ToolCostEstimate; restrictions: LocalOnlyRestriction[] };
export type ProductApiHealth = { ok: true; productId: ProductId; schemaVersion: string; timestamp: string };
export type ProductApiCapabilities = {
  productId: ProductId;
  productName: string;
  domain: string;
  runtimeSupport: RuntimeSupport[];
  availableTools: string[];
  agentTools: AgentTool[];
  requiredAuth: ToolPermission[];
  requiredEnvVars: string[];
  platformPayShSupport: boolean;
  userLocalPayShSupport: boolean;
  localOnlyRestrictions: LocalOnlyRestriction[];
  safeExecutionMode: "web_prepare_only";
  apiSchemaVersion: string;
  openApiLink?: string;
  mcpMetadata?: Record<string, unknown>;
};
export type AgentJob = { id: string; productId: ProductId; toolId: string; status: "queued" | "running" | "complete" | "failed"; input?: unknown; output?: unknown };
export type AgentQuote = { id: string; productId: ProductId; cost: ToolCostEstimate; expiresAt: string };
export type AgentExecutionRequest = { productId: ProductId; toolId: string; input: unknown; paymentPlane?: PaymentPlane };
export type AgentExecutionResult = { status: "prepared" | "executed" | "local_only" | "requires_payment" | "failed"; output?: unknown; localIntent?: unknown; error?: string };
export type ProductApiError = { error: string; code: string };
export type ProductRoutePlan = { productId: ProductId; href: string; runtime: RuntimeSupport; localOnly?: boolean };

function toolsForProduct(productId: ProductId): AgentTool[] {
  switch (productId) {
    case "hypermyths":
      return [
        { id: "terminal.chat", label: "Terminal chat", permission: "public", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "terminal.route", label: "Route to product", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "terminal.runWorkflow", label: "Run workflow", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "terminal.getJobs", label: "Get terminal jobs", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "terminal.getApprovals", label: "Get pending approvals", permission: "admin", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "terminal.approveAction", label: "Approve action", permission: "admin", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "terminal.rejectAction", label: "Reject action", permission: "admin", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "execute.prepare", label: "Prepare execution", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["trading_execution"] }
      ];
    case "hashmyth":
      return [
        { id: "video.script", label: "Generate video script", permission: "public", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "video.generate", label: "Generate video", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromToken", label: "Video from token", permission: "public", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromWallet", label: "Video from wallet", permission: "public", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromXProfile", label: "Video from X profile", permission: "public", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromMarketThesis", label: "Video from market thesis", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromResearchReport", label: "Video from research report", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromSimulation", label: "Video from simulation", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "video.fromAdCampaign", label: "Video from ad campaign", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] }
      ];
    case "polymyths":
      return [
        { id: "thesis.create", label: "Create thesis", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "prediction.analyze", label: "Analyze prediction", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "market.simulate", label: "Simulate market", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "polymarket.discover", label: "Discover markets", permission: "public", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "strategy.prepare", label: "Prepare strategy", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "scenario.create", label: "Create scenario", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] }
      ];
    case "cancerhawk":
      return [
        { id: "research.quest.create", label: "Create research quest", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "dataset.generate", label: "Generate synthetic dataset", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "literature.analyze", label: "Analyze literature", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "hypothesis.create", label: "Create hypothesis", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "contributor.score", label: "Score contributor", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "report.create", label: "Create report", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] }
      ];
    case "hyperkaon":
      return [
        { id: "simulation.create", label: "Create simulation", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "physics.quest.create", label: "Create physics quest", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "benchmark.generate", label: "Generate benchmark", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "result.analyze", label: "Analyze results", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "compute.quest.create", label: "Create compute quest", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] }
      ];
    case "hypertian":
      return [
        { id: "ad.campaign.create", label: "Create ad campaign", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "stream.overlay.create", label: "Create stream overlay", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "attention.analyze", label: "Analyze attention", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "creator.report", label: "Creator report", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "advertiser.quote", label: "Advertiser quote", permission: "public", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "campaign.optimize", label: "Optimize campaign", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "display.ad", label: "Display ad", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] }
      ];
    default:
      return [
        { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
        { id: "jobs.create", label: "Create job", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
        { id: "quote", label: "Quote action", permission: "public", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] }
      ];
  }
}

export function productHealth(productId: ProductId): ProductApiHealth {
  return { ok: true, productId, schemaVersion: "product-api.v1", timestamp: new Date().toISOString() };
}

export function productCapabilities(productId: ProductId): ProductApiCapabilities {
  const product = getProduct(productId);
  const tools = toolsForProduct(productId);
  return {
    productId,
    productName: product.displayName,
    domain: product.domain,
    runtimeSupport: productId === "hypermyths" ? ["web", "local", "hybrid"] : ["web", "hybrid"],
    availableTools: tools.map((tool) => tool.id),
    agentTools: tools,
    requiredAuth: ["public", "authenticated", "agent"],
    requiredEnvVars: ["NEXT_PUBLIC_PRODUCT_ID"],
    platformPayShSupport: true,
    userLocalPayShSupport: productId === "hypermyths",
    localOnlyRestrictions: productId === "hypermyths" ? ["trading_execution", "user_trading_keys", "user_local_payments", "private_strategy"] : ["none"],
    safeExecutionMode: "web_prepare_only",
    apiSchemaVersion: "product-api.v1",
    openApiLink: "/api/openapi.json",
    mcpMetadata: { productId, agentCallable: true }
  };
}

export function prepareAgentExecution(request: AgentExecutionRequest): AgentExecutionResult {
  if (request.toolId.includes("trade") || request.toolId.includes("execute")) {
    return { status: "local_only", localIntent: { id: crypto.randomUUID(), productId: request.productId, input: request.input, mode: "web_prepare_only" } };
  }
  return { status: "prepared", output: { jobId: crypto.randomUUID(), request } };
}
