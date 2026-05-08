import type { ProductId } from "@hypermyths/theme";
import { prepareAgentExecution, productCapabilities, type AgentExecutionRequest } from "@hypermyths/product-api";

export type AgentRoute = { productId: ProductId; toolId: string; endpoint: string; localOnly: boolean };

export function planAgentRoute(input: AgentExecutionRequest): AgentRoute {
  const localOnly = input.toolId.includes("trade") || input.toolId.includes("execute");
  return { productId: input.productId, toolId: input.toolId, endpoint: localOnly ? "/api/execute" : "/api/agent/run", localOnly };
}

export function runAgentRoute(input: AgentExecutionRequest) {
  return { route: planAgentRoute(input), capabilities: productCapabilities(input.productId), result: prepareAgentExecution(input) };
}
