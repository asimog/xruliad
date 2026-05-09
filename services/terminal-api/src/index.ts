import { normalizeFeedItem } from "@hypermyths/unified-feed";
import { runtimeStatus } from "@hypermyths/runtime";
import { productCapabilities, productHealth, prepareAgentExecution } from "@hypermyths/product-api";
import { startServiceRuntime } from "@hypermyths/service-runtime";
import type { ProductId } from "@hypermyths/theme";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

function seedFeedItems() {
  return [
    normalizeFeedItem({ source_product: "hypermyths", job_type: "command", title: "Feed check command", status: "complete", runtime_mode: "web", privacy_tier: "public" }),
    normalizeFeedItem({ source_product: "polymyths", job_type: "thesis", title: "Feed check thesis", status: "prepared", runtime_mode: "web", privacy_tier: "public" }),
    normalizeFeedItem({ source_product: "hypermyths", job_type: "local_trade_intent", title: "Private trade signal", status: "prepared", runtime_mode: "local", privacy_tier: "private_strategy", local_only: true })
  ];
}

startServiceRuntime({
  service: "terminal-api",
  role: "Main HyperMyths terminal backend: commands, routes, feed, runtime status, and product capability lookup.",
  publicSurface: "public",
  endpoints: [
    "GET /health",
    "GET /capabilities",
    "GET /runtime",
    "GET /feed",
    "GET /products/capabilities?productId=hypermyths",
    "POST /agent/run",
    "POST /commands",
    "POST /theses",
    "POST /jobs"
  ],
  capabilities: () => ({
    runtime: runtimeStatus(),
    products: ["hypermyths", "hashmyth", "polymyths", "hypertian", "cancerhawk", "hyperkaon"]
  }),
  routes: {
    "GET /runtime": () => runtimeStatus(),
    "GET /products/capabilities": ({ query }) => productCapabilities((query.productId as ProductId) ?? "hypermyths"),
    "GET /feed": () => {
      const feedItems = seedFeedItems();
      return { feedItems, total: feedItems.length };
    },
    "POST /agent/run": ({ body }) => {
      const input = bodyRecord(body);
      return prepareAgentExecution({
        productId: (input.productId as ProductId) ?? "hypermyths",
        toolId: String(input.toolId ?? "terminal.runWorkflow"),
        input: input.input ?? input
      });
    },
    "POST /commands": ({ body }) => ({
      id: crypto.randomUUID(),
      status: "queued",
      kind: "command",
      input: bodyRecord(body),
      createdAt: new Date().toISOString()
    }),
    "POST /theses": ({ body }) => ({
      id: crypto.randomUUID(),
      status: "draft",
      kind: "thesis",
      input: bodyRecord(body),
      createdAt: new Date().toISOString()
    }),
    "POST /jobs": ({ body }) => ({
      id: crypto.randomUUID(),
      status: "queued",
      kind: "terminal_job",
      input: bodyRecord(body),
      createdAt: new Date().toISOString()
    })
  }
});

export { productCapabilities, productHealth };
