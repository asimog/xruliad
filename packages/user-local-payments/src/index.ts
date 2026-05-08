export type UserLocalPaymentQuote = {
  id: string;
  paymentPlane: "user_local";
  provider: "pay.sh" | "x402";
  estimatedCostUsd: number;
  currency: string;
  localOnly: true;
  requiresApproval: true;
  createdAt: string;
};

export type UserLocalPaymentReceipt = UserLocalPaymentQuote & {
  status: "quoted" | "approved" | "executed" | "rejected" | "requires_setup";
  receiptId?: string;
};

export function readUserLocalPaymentStatus(env: NodeJS.ProcessEnv = process.env) {
  const missing = ["USER_PAYSH_API_BASE_URL", "USER_PAYSH_WALLET_PRIVATE_KEY"].filter((key) => !env[key]);
  return {
    configured: missing.length === 0,
    missing,
    localOnly: env.USER_PAYSH_LOCAL_ONLY !== "false",
    network: env.USER_PAYSH_NETWORK ?? "base",
    currency: env.USER_PAYSH_DEFAULT_CURRENCY ?? "USDC",
    maxRequestCost: Number(env.USER_PAYSH_MAX_REQUEST_COST ?? 1)
  };
}

export function quoteUserLocalRequest(input: { provider?: "pay.sh" | "x402"; estimatedCostUsd?: number }): UserLocalPaymentQuote {
  const status = readUserLocalPaymentStatus();
  const estimatedCostUsd = input.estimatedCostUsd ?? 0;
  if (estimatedCostUsd > status.maxRequestCost) throw new Error("User-local paid request exceeds local spend policy.");
  return {
    id: crypto.randomUUID(),
    paymentPlane: "user_local",
    provider: input.provider ?? "pay.sh",
    estimatedCostUsd,
    currency: status.currency,
    localOnly: true,
    requiresApproval: true,
    createdAt: new Date().toISOString()
  };
}

export function approveUserLocalQuote(quote: UserLocalPaymentQuote, approved: boolean): UserLocalPaymentReceipt {
  const status = readUserLocalPaymentStatus();
  if (!status.localOnly) throw new Error("USER_PAYSH_LOCAL_ONLY must remain true for user-local payments.");
  if (!status.configured) return { ...quote, status: "requires_setup" };
  return { ...quote, status: approved ? "approved" : "rejected", receiptId: approved ? crypto.randomUUID() : undefined };
}
