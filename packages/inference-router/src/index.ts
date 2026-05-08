import type { PrivacyTier } from "@hypermyths/privacy";
import { routeByPrivacy } from "@hypermyths/privacy";
import { readQvacStatus } from "@hypermyths/qvac";

export type InferenceTaskClass =
  | "public_summary"
  | "video_script"
  | "ad_generation"
  | "market_intelligence_public"
  | "market_strategy_private"
  | "trading_intent"
  | "research_public"
  | "research_sensitive"
  | "code_public"
  | "code_private"
  | "command_contribution"
  | "thesis_run";

export type InferenceProvider = "qvac_local" | "openrouter_free" | "openrouter_paid" | "x402" | "dexter" | "paysh_platform" | "paysh_user_local" | "cached" | "blocked";
export type InferenceRoute = { provider: InferenceProvider; requiresApproval: boolean; requiresQuote: boolean; reason: string };

export function routeInference(input: { taskClass: InferenceTaskClass; privacyTier: PrivacyTier; paid?: boolean; explicitCloudApproval?: boolean }): InferenceRoute {
  const qvac = readQvacStatus();
  const privacy = routeByPrivacy({ tier: input.privacyTier, runtimeMode: "web", qvacAvailable: qvac.paired, explicitCloudApproval: input.explicitCloudApproval });
  if (!privacy.allowed) return { provider: "blocked", requiresApproval: privacy.requiresApproval, requiresQuote: false, reason: privacy.reason };
  if (input.taskClass === "trading_intent") return { provider: "paysh_user_local", requiresApproval: true, requiresQuote: true, reason: "Trading intent is local/hybrid only." };
  if (input.privacyTier === "private_strategy") return { provider: "qvac_local", requiresApproval: false, requiresQuote: false, reason: "Private strategy prefers QVAC." };
  if (input.paid) return { provider: "paysh_platform", requiresApproval: false, requiresQuote: true, reason: "Paid web action uses platform pay.sh." };
  return { provider: process.env.OPENROUTER_ALLOW_FREE === "false" ? "cached" : "openrouter_free", requiresApproval: false, requiresQuote: false, reason: "Cheapest safe public route selected." };
}
