import { createResearchQuest } from "@hypermyths/intelligence";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "research-worker",
  role: "Creates careful research quests and synthetic data tasks without clinical treatment claims.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /research/quests"],
  capabilities: () => ({
    demo: createResearchQuest({
      productId: "cancerhawk",
      title: "safe research quest",
      prompt: "Generate a dataset task; no treatment claims.",
      safetyNotes: ["No clinical or treatment claims."]
    })
  }),
  routes: {
    "POST /research/quests": ({ body }) => {
      const input = bodyRecord(body);
      return createResearchQuest({
        productId: (input.productId as "cancerhawk" | "hyperkaon") ?? "cancerhawk",
        title: String(input.title ?? "Research quest"),
        prompt: String(input.prompt ?? "Generate a safe research task."),
        safetyNotes: Array.isArray(input.safetyNotes) ? input.safetyNotes.map(String) : ["No clinical or treatment claims."]
      });
    }
  }
});
