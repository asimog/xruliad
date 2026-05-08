import { NextRequest, NextResponse } from "next/server";

import { getActivePayShCheckout } from "@/lib/pay/intermediary";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const checkout = await getActivePayShCheckout(jobId);
  if (!checkout || checkout.quote.rail !== "x402_usdc") {
    return NextResponse.json({ error: "x402 quote not found" }, { status: 404 });
  }

  const proof =
    request.headers.get("payment-signature") ??
    request.headers.get("x-payment") ??
    request.headers.get("payment");

  if (!proof) {
    return NextResponse.json(
      {
        error: "Payment Required",
        jobId,
        amountUsdc: checkout.payment.amountUsdc,
        currency: "USDC",
        network: "x402",
        confirmUrl: `/api/pay-sh/jobs/${jobId}/confirm-payment`,
      },
      {
        status: 402,
        headers: {
          "payment-required": Buffer.from(
            JSON.stringify({
              jobId,
              amount: checkout.payment.amountUsdc,
              currency: "USDC",
              network: "x402",
              reason: "HyperMyths Pay.sh job checkout",
            }),
          ).toString("base64"),
        },
      },
    );
  }

  return NextResponse.json({
    ok: true,
    jobId,
    proofReceived: true,
    confirmUrl: `/api/pay-sh/jobs/${jobId}/confirm-payment`,
  });
}
