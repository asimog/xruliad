import type { ExecutionMode } from "@hypermyths/runtime";

export type RiskPolicy = {
  executionMode: ExecutionMode;
  requireUserApproval: boolean;
  maxTradeSize?: number;
  dailyTradeLimit?: number;
  allowedVenues: string[];
  allowedAssets: string[];
};

export type RiskCheckResult = { allowed: boolean; reason: string; policy: RiskPolicy };

export function readRiskPolicy(env: NodeJS.ProcessEnv = process.env): RiskPolicy {
  return {
    executionMode: (env.EXECUTION_MODE as ExecutionMode | undefined) ?? "web_prepare_only",
    requireUserApproval: env.REQUIRE_USER_APPROVAL !== "false",
    maxTradeSize: env.MAX_TRADE_SIZE ? Number(env.MAX_TRADE_SIZE) : undefined,
    dailyTradeLimit: env.DAILY_TRADE_LIMIT ? Number(env.DAILY_TRADE_LIMIT) : undefined,
    allowedVenues: (env.ALLOWED_VENUES ?? "paper,devnet").split(",").map((v) => v.trim()).filter(Boolean),
    allowedAssets: (env.ALLOWED_ASSETS ?? "").split(",").map((v) => v.trim()).filter(Boolean)
  };
}

export function checkExecutionRisk(input: { venue: string; asset: string; notional?: number; approved?: boolean }, policy = readRiskPolicy()): RiskCheckResult {
  if (policy.executionMode === "web_prepare_only") return { allowed: false, reason: "Web can only prepare/export execution intents.", policy };
  if (policy.requireUserApproval && !input.approved) return { allowed: false, reason: "Execution requires explicit local user approval.", policy };
  if (!policy.allowedVenues.includes(input.venue)) return { allowed: false, reason: `Venue ${input.venue} is not allowed.`, policy };
  if (policy.allowedAssets.length && !policy.allowedAssets.includes(input.asset)) return { allowed: false, reason: `Asset ${input.asset} is not allowed.`, policy };
  if (policy.maxTradeSize !== undefined && input.notional !== undefined && input.notional > policy.maxTradeSize) return { allowed: false, reason: "Intent exceeds max trade size.", policy };
  return { allowed: true, reason: "Risk policy passed.", policy };
}
