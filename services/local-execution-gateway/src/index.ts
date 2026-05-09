import { localExecutionGatewayStatus } from "@hypermyths/execution";
import { localTradingCapabilities } from "@hypermyths/local-trading";
import { startServiceRuntime } from "@hypermyths/service-runtime";

const status = { health: localExecutionGatewayStatus(false), capabilities: localTradingCapabilities() };
if (process.argv.includes("--check")) {
  console.log(JSON.stringify(status, null, 2));
} else {
  startServiceRuntime({
    service: "local-execution-gateway",
    role: "Local-only execution gateway. Public cloud can prepare intents only; live user trading stays local.",
    publicSurface: "local_only",
    endpoints: ["GET /health", "GET /capabilities", "GET /execution/status"],
    capabilities: () => status,
    routes: {
      "GET /execution/status": () => status
    },
    defaultPort: 8790
  });
}
