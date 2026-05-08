import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";

describe("resolveMemecoinMetadata DexScreener search fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses /search fallback when token endpoint is non-usable for Solana address", async () => {
    const address = "ACtfUWtgvaXrQGNMiohTusi5jcx5RJf5zwu9aAxkpump";

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pairs: [
              {
                chainId: "solana",
                dexId: "pumpfun",
                baseToken: { address: "NotTheRequestedAddress", name: "Other", symbol: "OTHER" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pairs: [
              {
                chainId: "solana",
                dexId: "raydium",
                url: "https://dexscreener.com/solana/validpair",
                baseToken: {
                  address,
                  name: "Myth Token",
                  symbol: "MYTH",
                },
                info: {
                  imageUrl: "https://cdn.example.com/myth.png",
                },
                liquidity: { usd: 100000 },
                volume: { h24: 250000 },
                marketCap: 5000000,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await resolveMemecoinMetadata({
      address,
      chain: "solana",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.chain).toBe("solana");
    expect(result.name).toBe("Myth Token");
    expect(result.symbol).toBe("MYTH");
    expect(result.image).toBe("https://cdn.example.com/myth.png");
    expect(result.marketSnapshot.pairUrl).toBe(
      "https://dexscreener.com/solana/validpair",
    );
  });
});
