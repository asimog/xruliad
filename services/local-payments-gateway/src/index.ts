import { readUserLocalPaymentStatus } from "@hypermyths/user-local-payments";
import { startServiceRuntime } from "@hypermyths/service-runtime";

startServiceRuntime({
  service: "local-payments-gateway",
  role: "Local-only user pay.sh/x402 payment gateway. Do not expose publicly.",
  publicSurface: "local_only",
  endpoints: ["GET /health", "GET /capabilities", "GET /spend-policy"],
  capabilities: () => ({ status: readUserLocalPaymentStatus() }),
  routes: {
    "GET /spend-policy": () => readUserLocalPaymentStatus()
  },
  defaultPort: 8791
});
