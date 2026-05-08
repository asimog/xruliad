import type { ProductId } from "@hypermyths/theme";

export type DisplayPermission = "public" | "permissioned" | "private";
export type DisplaySurface = "terminal" | "hashmyth" | "hypertian_overlay" | "polymyths_report" | "cancerhawk_research" | "hyperkaon_simulation";
export type DisplayEmbed = { html?: string; url?: string; iframeAllowed?: boolean };
export type DisplayArtifact = { id: string; productId: ProductId; kind: "video" | "intelligence" | "ad" | "thesis"; surface: DisplaySurface; permission: DisplayPermission; sponsorMetadataVisible?: boolean; routeMetadata?: Record<string, unknown>; createdAt: string };
export type AgentDisplayRequest = Omit<DisplayArtifact, "id" | "createdAt">;
export type DisplayReceipt = { id: string; artifactId: string; paymentPlane: "platform" | "free"; createdAt: string };

export function createDisplayArtifact(input: AgentDisplayRequest): DisplayArtifact {
  if (input.kind === "ad" && input.sponsorMetadataVisible !== true) throw new Error("Paid ads must expose sponsor/payment metadata.");
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function displayCapabilities() {
  return { endpoints: ["GET /api/display/capabilities", "POST /api/display/video", "POST /api/display/intelligence", "POST /api/display/ad", "POST /api/display/thesis", "GET /api/display/:id"], agentCallable: true };
}
