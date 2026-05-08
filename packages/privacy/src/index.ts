import type { AppRuntimeMode } from "@hypermyths/runtime";

export type PrivacyTier =
  | "public"
  | "internal"
  | "sensitive"
  | "private_strategy"
  | "wallet_or_key_material"
  | "medical_research_sensitive"
  | "proprietary_code";

export type ProviderPlane = "web_cloud" | "platform_paid" | "local_qvac" | "user_local_paid" | "blocked";

export type PrivacyRouteDecision = {
  allowed: boolean;
  providerPlane: ProviderPlane;
  requiresApproval: boolean;
  reason: string;
};

export function classifyInput(input: string): PrivacyTier {
  if (/private\s*key|seed phrase|mnemonic|wallet secret|api secret/i.test(input)) return "wallet_or_key_material";
  if (/live trade|strategy|stop loss|entry|exit|position sizing/i.test(input)) return "private_strategy";
  if (/patient|clinical|diagnosis|treatment|medical record/i.test(input)) return "medical_research_sensitive";
  return "public";
}

export function routeByPrivacy(input: { tier: PrivacyTier; runtimeMode: AppRuntimeMode; qvacAvailable?: boolean; explicitCloudApproval?: boolean }): PrivacyRouteDecision {
  if (input.tier === "wallet_or_key_material") {
    return { allowed: false, providerPlane: "blocked", requiresApproval: true, reason: "Wallet/key material cannot be routed to external inference." };
  }
  if (input.tier === "private_strategy") {
    if (input.qvacAvailable) return { allowed: true, providerPlane: "local_qvac", requiresApproval: false, reason: "Private strategy routed to local QVAC." };
    return { allowed: false, providerPlane: "blocked", requiresApproval: true, reason: "Private strategy requires local QVAC or explicit local-only handling." };
  }
  if (input.tier === "medical_research_sensitive" && !input.explicitCloudApproval) {
    return { allowed: false, providerPlane: "blocked", requiresApproval: true, reason: "Sensitive research needs redaction, local QVAC, or explicit cloud approval." };
  }
  return { allowed: true, providerPlane: "web_cloud", requiresApproval: input.tier !== "public", reason: "Cloud-safe route permitted." };
}
