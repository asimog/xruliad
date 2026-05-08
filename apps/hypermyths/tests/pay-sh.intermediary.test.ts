import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Pay.sh intermediary quoting", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.PAY_SH_PLATFORM_FEE_BPS = "1000";
    process.env.PAY_SH_BUFFER_BPS = "500";
    process.env.PAY_SH_QUOTE_TTL_SECONDS = "900";
    process.env.PAY_SH_SOL_USD_RATE = "100";
  });

  it("calculates pass-through cost plus configurable fee and buffer", async () => {
    const { quotePayShWork } = await import("@/lib/pay/intermediary");

    const quote = quotePayShWork({
      jobId: "job_quote_test",
      kind: "asset_scan",
      rail: "solana_sol",
      inputDigest: "digest",
      operations: [
        { endpointId: "perplexity_search", calls: 2 },
        { endpointId: "stableenrich_firecrawl_search", calls: 1 },
      ],
    });

    expect(quote.subtotalUsd).toBe(0.05);
    expect(quote.platformFeeUsd).toBe(0.005);
    expect(quote.bufferUsd).toBe(0.0025);
    expect(quote.totalUsd).toBe(0.0575);
    expect(quote.totalLamports).toBe("575000");
    expect(quote.operations).toHaveLength(2);
  });
});
