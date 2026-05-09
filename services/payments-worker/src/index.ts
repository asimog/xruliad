import { readPlatformPayShStatus, readUserLocalPaymentStatus } from "@hypermyths/paysh";
import { quotePlatformAction } from "@hypermyths/platform-payments";
import { quoteUserLocalRequest } from "@hypermyths/user-local-payments";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "payments-worker",
  role: "Reports platform and user-local payment plane status and prepares transparent quotes.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "GET /payments/status", "POST /payments/quote"],
  capabilities: () => ({
    platform: readPlatformPayShStatus(),
    userLocal: readUserLocalPaymentStatus()
  }),
  routes: {
    "GET /payments/status": () => ({
      platform: readPlatformPayShStatus(),
      userLocal: readUserLocalPaymentStatus()
    }),
    "POST /payments/quote": ({ body }) => {
      const input = bodyRecord(body);
      if (input.paymentPlane === "user_local") {
        return quoteUserLocalRequest({
          provider: (input.provider as never) ?? "pay.sh",
          estimatedCostUsd: Number(input.estimatedCostUsd ?? 0)
        });
      }
      return quotePlatformAction({
        productId: (input.productId as never) ?? "hashmyth",
        action: (input.action as never) ?? "video_generation",
        estimatedCostUsd: Number(input.estimatedCostUsd ?? 0)
      });
    }
  }
});
