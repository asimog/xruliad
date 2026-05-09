import { routeInference } from "@hypermyths/inference-router";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "inference-router",
  role: "Chooses the cheapest safe inference route for public, private, and hybrid tasks.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /route"],
  capabilities: () => ({
    sampleRoute: routeInference({ taskClass: "public_summary", privacyTier: "public" })
  }),
  routes: {
    "POST /route": ({ body }) => routeInference(bodyRecord(body) as never)
  }
});
