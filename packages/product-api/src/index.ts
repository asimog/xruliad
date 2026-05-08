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

const defaultTools: AgentTool[] = [
  { id: "agent.run", label: "Run agent tool", permission: "agent", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
  { id: "jobs.create", label: "Create job", permission: "authenticated", cost: { paymentPlane: "platform", requiresQuote: true }, restrictions: ["none"] },
  { id: "quote", label: "Quote action", permission: "public", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["none"] },
  { id: "execute.prepare", label: "Prepare execution", permission: "authenticated", cost: { paymentPlane: "free", requiresQuote: false }, restrictions: ["trading_execution"] }
];

export function productHealth(productId: ProductId): ProductApiHealth {
  return { ok: true, productId, schemaVersion: "product-api.v1", timestamp: new Date().toISOString() };
}

export function productCapabilities(productId: ProductId): ProductApiCapabilities {
  const product = getProduct(productId);
  return {
    productId,
    productName: product.displayName,
    domain: product.domain,
    runtimeSupport: productId === "hypermyths" ? ["web", "local", "hybrid"] : ["web", "hybrid"],
    availableTools: defaultTools.map((tool) => tool.id),
    agentTools: defaultTools,
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
