import { describe, expect, it } from "vitest";

import { collectPayShEvidence } from "@/lib/asset-analysis/pay-research";

describe("asset analysis Pay.sh research", () => {
  it("returns endpoint metadata without requiring the pay CLI when disabled", async () => {
    const result = await collectPayShEvidence("HyperMyths asset scanner");

    expect(result.evidence).toEqual([]);
    expect(result.endpoints.length).toBeGreaterThan(0);
    expect(result.endpoints.some((endpoint) => endpoint.service.includes("stableenrich"))).toBe(true);
    expect(result.endpoints.some((endpoint) => endpoint.service.includes("stablesocial"))).toBe(true);
  });
});
