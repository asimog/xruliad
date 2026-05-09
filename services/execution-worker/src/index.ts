import { localExecutionGatewayStatus } from "@hypermyths/execution";
import { startServiceRuntime } from "@hypermyths/service-runtime";

startServiceRuntime({
  service: "execution-worker",
  role: "Execution policy worker. Public cloud can prepare intents only; live user trading remains local-only.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "GET /execution/status"],
  capabilities: () => ({
    note: "Local execution only; Railway/Vercel must not run live user trading.",
    status: localExecutionGatewayStatus(false)
  }),
  routes: {
    "GET /execution/status": () => ({
      note: "Local execution only; Railway/Vercel must not run live user trading.",
      status: localExecutionGatewayStatus(false)
    })
  }
});
