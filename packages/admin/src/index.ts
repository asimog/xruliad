import type { ProductId } from "@hypermyths/theme";

export type AdminSection =
  | "overview"
  | "feed_moderation"
  | "jobs"
  | "agent_runs"
  | "payments"
  | "wallet_spawn"
  | "settings"
  | "display_approval"
  | "product_settings"
  | "runtime_status";

export type AdminAction =
  | "approve"
  | "reject"
  | "hide"
  | "flag"
  | "unhide";

export type AdminAuthStatus = {
  authenticated: boolean;
  role: "admin" | "viewer" | "none";
  email?: string;
  walletAddress?: string;
  note?: string;
};

export type AdminOverview = {
  totalJobs: number;
  activeJobs: number;
  pendingApprovals: number;
  totalFeedItems: number;
  flaggedItems: number;
  platformPaymentTotalUsd: number;
  openRouterConfigured: boolean;
  payShConfigured: boolean;
  supabaseConfigured: boolean;
  hermesWorkerOnline: boolean;
  executionMode: "web_prepare_only";
};

export type AdminFeedModeration = {
  items: Array<{
    id: string;
    title: string;
    status: string;
    sourceProduct: string;
    visibility: string;
    createdAt: string;
  }>;
  filters: {
    status: string[];
    product: string[];
    visibility: string[];
  };
};

export type AdminJobList = {
  jobs: Array<{
    id: string;
    productId: string;
    status: string;
    createdAt: string;
  }>;
};

export type AdminAgentRun = {
  id: string;
  productId: string;
  toolId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
};

export type AdminPaymentReceipt = {
  id: string;
  paymentPlane: "platform" | "user_local";
  productId: string;
  action: string;
  estimatedCostUsd: number;
  currency: string;
  status: string;
  publicReceipt: boolean;
  createdAt: string;
};

export type AdminRuntimeStatus = {
  hermesWorkerHealthy: boolean;
  openRouterOnline: boolean;
  supabaseOnline: boolean;
  payShOnline: boolean;
  lastChecked: string;
};

export function adminOverview(config: {
  openRouterConfigured?: boolean;
  payShConfigured?: boolean;
  supabaseConfigured?: boolean;
  hermesWorkerOnline?: boolean;
}): AdminOverview {
  return {
    totalJobs: 0,
    activeJobs: 0,
    pendingApprovals: 0,
    totalFeedItems: 0,
    flaggedItems: 0,
    platformPaymentTotalUsd: 0,
    openRouterConfigured: config.openRouterConfigured ?? false,
    payShConfigured: config.payShConfigured ?? false,
    supabaseConfigured: config.supabaseConfigured ?? false,
    hermesWorkerOnline: config.hermesWorkerOnline ?? false,
    executionMode: "web_prepare_only"
  };
}

export function checkAdminAuth(input: {
  emails?: string[];
  walletAddresses?: string[];
  userEmail?: string;
  userWallet?: string;
}): AdminAuthStatus {
  const adminEmails = input.emails ?? [];
  const adminWallets = input.walletAddresses ?? [];
  if (input.userEmail && adminEmails.includes(input.userEmail)) {
    return { authenticated: true, role: "admin", email: input.userEmail };
  }
  if (input.userWallet && adminWallets.includes(input.userWallet)) {
    return { authenticated: true, role: "admin", walletAddress: input.userWallet };
  }
  if (adminEmails.length === 0 && adminWallets.length === 0) {
    return { authenticated: true, role: "viewer", note: "Admin auth not configured — viewer access granted" };
  }
  return { authenticated: false, role: "none" };
}

export const ADMIN_SECTIONS: Array<{ id: AdminSection; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "System-wide status and metrics" },
  { id: "feed_moderation", label: "Feed Moderation", description: "Approve, hide, or flag feed items" },
  { id: "jobs", label: "Jobs", description: "View and manage all jobs across products" },
  { id: "agent_runs", label: "Agent Runs", description: "Track agent execution history" },
  { id: "payments", label: "Payments", description: "Platform payment receipts and history" },
  { id: "wallet_spawn", label: "Wallet Spawn", description: "Spawn wallet intents for local signing" },
  { id: "settings", label: "Settings", description: "Product and platform settings" },
  { id: "display_approval", label: "Display Approval", description: "Approve display artifacts" },
  { id: "product_settings", label: "Product Settings", description: "Per-product configuration" },
  { id: "runtime_status", label: "Runtime Status", description: "Service health and connectivity" }
];

export function isAdminSection(id: string): id is AdminSection {
  return ADMIN_SECTIONS.some((s) => s.id === id);
}

export function getAdminTools(productId: ProductId): string[] {
  switch (productId) {
    case "hypermyths":
      return ["terminal.getApprovals", "terminal.approveAction", "terminal.rejectAction"];
    case "hashmyth":
      return ["video.jobs.manage", "feed.moderate", "payment.receipts"];
    case "hypertian":
      return ["ad.moderate", "campaign.approve", "display.approve"];
    case "polymyths":
      return ["thesis.moderate", "prediction.approve"];
    case "cancerhawk":
      return ["quest.moderate", "report.approve"];
    case "hyperkaon":
      return ["simulation.moderate", "compute.approve"];
  }
}
