import type { ProductId } from "@hypermyths/theme";

export type AgentWorkflow = {
  id: string;
  productId: ProductId;
  description: string;
  entrypoint: string;
  canUsePaySh: boolean;
  canUseMiroShark: boolean;
};

export const agentWorkflows: AgentWorkflow[] = [
  { id: "hypermyths-intelligence-video", productId: "hypermyths", description: "Token/profile intelligence to video script workflow.", entrypoint: "services/intelligence-worker", canUsePaySh: true, canUseMiroShark: true },
  { id: "hypertian-attention-analysis", productId: "hypertian", description: "Creator/ad attention market analysis workflow.", entrypoint: "services/ad-server", canUsePaySh: true, canUseMiroShark: true },
  { id: "cancerhawk-research-quest", productId: "cancerhawk", description: "Careful biomedical synthetic data quest workflow.", entrypoint: "services/synthetic-data-worker", canUsePaySh: true, canUseMiroShark: true },
  { id: "hyperkaon-physics-simulation", productId: "hyperkaon", description: "Physics simulation and compute quest workflow.", entrypoint: "services/simulation-worker", canUsePaySh: true, canUseMiroShark: true },
  { id: "polymyths-scenario-thesis", productId: "polymyths", description: "Narrative thesis and prediction scenario workflow.", entrypoint: "services/intelligence-worker", canUsePaySh: true, canUseMiroShark: true }
];

export function getMotoSetupStatus() {
  const basePath = process.env.MOTO_BASE_PATH;
  return {
    installed: Boolean(basePath),
    basePath,
    dockerEnabled: process.env.MOTO_DOCKER_ENABLED === "true",
    defaultAgent: process.env.MOTO_DEFAULT_AGENT ?? "codex",
    logLevel: process.env.MOTO_LOG_LEVEL ?? "info",
    note: "buildingopen/moto now redirects to floomhq/fstack; this package treats moto/fstack as the agent control-plane boundary."
  };
}
