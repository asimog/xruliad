import { createMarketIntelligenceReport, createVideoScript, createVideoScriptReport } from "@hypermyths/intelligence";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "intelligence-worker",
  role: "Cross-product intelligence reports, summaries, and video script preparation.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /intelligence/reports", "POST /intelligence/video-script"],
  capabilities: () => ({
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    providerConfigured: Boolean(process.env.OPENROUTER_API_KEY || process.env.AI_PROVIDER_API_KEY)
  }),
  routes: {
    "POST /intelligence/reports": ({ body }) => {
      const input = bodyRecord(body);
      return createMarketIntelligenceReport({
        productId: (input.productId as never) ?? "polymyths",
        title: String(input.title ?? "Intelligence report"),
        summary: String(input.summary ?? input.prompt ?? "Prepared intelligence report.")
      });
    },
    "POST /intelligence/video-script": ({ body }) => {
      const input = bodyRecord(body);
      const script = createVideoScript({
        productId: (input.productId as never) ?? "hashmyth",
        title: String(input.title ?? "Video script"),
        thesis: String(input.thesis ?? input.prompt ?? "Prepared video thesis.")
      });
      return createVideoScriptReport(script);
    }
  }
});
