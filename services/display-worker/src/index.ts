import { createDisplayArtifact, displayCapabilities } from "@hypermyths/display";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "display-worker",
  role: "Creates public and permissioned display artifacts for terminal, video, ad, thesis, and research surfaces.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /display/artifacts"],
  capabilities: displayCapabilities,
  routes: {
    "POST /display/artifacts": ({ body }) => {
      const input = bodyRecord(body);
      return createDisplayArtifact({
        productId: (input.productId as never) ?? "hypermyths",
        kind: (input.kind as never) ?? "intelligence",
        surface: (input.surface as never) ?? "terminal",
        permission: (input.permission as never) ?? "public",
        sponsorMetadataVisible: input.kind === "ad" ? true : undefined,
        routeMetadata: input.routeMetadata as Record<string, unknown> | undefined
      });
    }
  }
});
