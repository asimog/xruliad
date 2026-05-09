import { runAgentRoute } from "@hypermyths/agent-router";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "agent-router",
  role: "Routes product agent tool calls to the correct HyperMyths engine.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /agent/run"],
  capabilities: () => ({
    defaultRoute: runAgentRoute({ productId: "hypermyths", toolId: "agent.run", input: {} })
  }),
  routes: {
    "POST /agent/run": ({ body }) => {
      const input = bodyRecord(body);
      return runAgentRoute({
        productId: String(input.productId ?? "hypermyths") as never,
        toolId: String(input.toolId ?? "agent.run"),
        input: input.input ?? input
      });
    }
  }
});
