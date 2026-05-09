import { createCommand, contributeToCommand, exportCommandLocalIntent } from "@hypermyths/command-protocol";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "command-worker",
  role: "Runs and contributes to command protocol jobs.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /commands", "POST /commands/contribute", "POST /commands/export-local-intent"],
  routes: {
    "POST /commands": ({ body }) => {
      const input = bodyRecord(body);
      return createCommand({
        productId: (input.productId as never) ?? "hypermyths",
        type: (input.type as never) ?? "user_agent_task",
        title: String(input.title ?? "Worker command"),
        prompt: String(input.prompt ?? "Run task"),
        permission: (input.permission as never) ?? "private"
      });
    },
    "POST /commands/contribute": ({ body }) => {
      const input = bodyRecord(body);
      return contributeToCommand({
        commandId: String(input.commandId ?? crypto.randomUUID()),
        contributor: String(input.contributor ?? "agent"),
        kind: (input.kind as never) ?? "model_output",
        payload: input.payload ?? input
      });
    },
    "POST /commands/export-local-intent": ({ body }) => {
      const input = bodyRecord(body);
      const command = createCommand({
        productId: (input.productId as never) ?? "hypermyths",
        type: (input.type as never) ?? "market_thesis",
        title: String(input.title ?? "Local intent"),
        prompt: String(input.prompt ?? ""),
        permission: "local_only"
      });
      return exportCommandLocalIntent(command);
    }
  }
});
