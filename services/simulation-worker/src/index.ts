import { createScenario, readMiroSharkConfig } from "@hypermyths/simulation";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "simulation-worker",
  role: "Prepares simulation scenarios and reports MiroShark readiness.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /simulation/scenarios"],
  capabilities: () => ({ miroshark: readMiroSharkConfig() }),
  routes: {
    "POST /simulation/scenarios": ({ body }) => {
      const input = bodyRecord(body);
      return createScenario({
        productId: (input.productId as never) ?? "hyperkaon",
        title: String(input.title ?? "Simulation scenario"),
        seed: String(input.seed ?? input.prompt ?? "default simulation seed"),
        populationSize: Number(input.populationSize ?? 80),
        timelineHours: Number(input.timelineHours ?? 8)
      });
    }
  }
});
