import { createPlatformReceipt, quotePlatformAction, readPlatformPayShStatus } from "@hypermyths/platform-payments";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "platform-payments-worker",
  role: "Server-side platform pay.sh quote and receipt boundary.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "GET /payments/platform/status", "POST /payments/platform/quote", "POST /payments/platform/receipt"],
  capabilities: () => ({ platform: readPlatformPayShStatus() }),
  routes: {
    "GET /payments/platform/status": () => readPlatformPayShStatus(),
    "POST /payments/platform/quote": ({ body }) => {
      const input = bodyRecord(body);
      return quotePlatformAction({
        productId: (input.productId as never) ?? "hashmyth",
        action: (input.action as never) ?? "video_generation",
        estimatedCostUsd: Number(input.estimatedCostUsd ?? 0)
      });
    },
    "POST /payments/platform/receipt": ({ body }) => {
      const input = bodyRecord(body);
      const quote = quotePlatformAction({
        productId: (input.productId as never) ?? "hashmyth",
        action: (input.action as never) ?? "video_generation",
        estimatedCostUsd: Number(input.estimatedCostUsd ?? 0)
      });
      return createPlatformReceipt(quote, Boolean(input.paid));
    }
  }
});
