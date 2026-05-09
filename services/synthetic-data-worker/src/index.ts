import { createResearchQuest } from "@hypermyths/intelligence";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "synthetic-data-worker",
  role: "Prepares safe synthetic data quests for CancerHawk research workflows.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /synthetic-data/quests"],
  capabilities: () => ({
    providerConfigured: Boolean(process.env.OPENROUTER_API_KEY || process.env.AI_PROVIDER_API_KEY)
  }),
  routes: {
    "POST /synthetic-data/quests": ({ body }) => {
      const input = bodyRecord(body);
      return createResearchQuest({
        productId: "cancerhawk",
        title: String(input.title ?? "Synthetic data quest"),
        prompt: String(input.prompt ?? "Create a safe synthetic data task."),
        safetyNotes: ["No clinical, treatment, diagnosis, or efficacy claims."]
      });
    }
  }
});
