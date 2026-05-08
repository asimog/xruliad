import type { ProductId } from "@hypermyths/types";

export type PlatformActionKind = "video_generation" | "premium_intelligence" | "ad_display" | "research_quest" | "simulation_quest" | "display_boost";
export type PaymentPlane = "platform" | "user_local";

export type PlatformPaymentQuote = {
  id: string;
  paymentPlane: "platform";
  productId: ProductId;
  action: PlatformActionKind;
  provider: "pay.sh" | "internal_credit" | "free";
  estimatedCostUsd: number;
  currency: string;
  publicReceipt: boolean;
  costBreakdown: Array<{ label: string; amountUsd: number }>;
  createdAt: string;
};

export type PlatformPaymentReceipt = PlatformPaymentQuote & {
  status: "quoted" | "paid" | "settled" | "failed" | "requires_setup";
  finalCostUsd?: number;
  receiptId?: string;
};

export function readPlatformPayShStatus(env: NodeJS.ProcessEnv = process.env) {
  const missing = ["PLATFORM_PAYSH_API_BASE_URL", "PLATFORM_PAYSH_WALLET_PRIVATE_KEY"].filter((key) => !env[key]);
  return {
    configured: missing.length === 0,
    missing,
    receiptsPublic: env.PLATFORM_PAYSH_RECEIPTS_PUBLIC !== "false",
    network: env.PLATFORM_PAYSH_NETWORK ?? "base",
    currency: env.PLATFORM_PAYSH_DEFAULT_CURRENCY ?? "USDC"
  };
}

export function quotePlatformAction(input: { productId: ProductId; action: PlatformActionKind; estimatedCostUsd?: number; provider?: PlatformPaymentQuote["provider"] }): PlatformPaymentQuote {
  const status = readPlatformPayShStatus();
  const estimatedCostUsd = input.estimatedCostUsd ?? 0;
  return {
    id: crypto.randomUUID(),
    paymentPlane: "platform",
    productId: input.productId,
    action: input.action,
    provider: input.provider ?? (estimatedCostUsd > 0 ? "pay.sh" : "free"),
    estimatedCostUsd,
    currency: status.currency,
    publicReceipt: status.receiptsPublic,
    costBreakdown: [{ label: input.action, amountUsd: estimatedCostUsd }],
    createdAt: new Date().toISOString()
  };
}

export function createPlatformReceipt(quote: PlatformPaymentQuote, paid = false): PlatformPaymentReceipt {
  const setup = readPlatformPayShStatus();
  if (quote.provider === "pay.sh" && !setup.configured) return { ...quote, status: "requires_setup" };
  return { ...quote, status: paid ? "paid" : "quoted", finalCostUsd: paid ? quote.estimatedCostUsd : undefined, receiptId: paid ? crypto.randomUUID() : undefined };
}
