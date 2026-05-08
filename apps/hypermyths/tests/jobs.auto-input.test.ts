import { detectAutoInputType } from "@/lib/jobs/auto-input";
import { describe, expect, it } from "vitest";

describe("detectAutoInputType", () => {
  it("detects empty input as random", () => {
    expect(detectAutoInputType("")).toBe("random");
  });

  it("detects X handles and profile URLs as mythx", () => {
    expect(detectAutoInputType("@hypermyths")).toBe("mythx");
    expect(detectAutoInputType("https://x.com/hypermyths")).toBe("mythx");
    expect(detectAutoInputType("hypermyths")).toBe("mythx");
  });

  it("detects wallet addresses as hashmyth", () => {
    expect(detectAutoInputType("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "hashmyth",
    );
    expect(detectAutoInputType("6QWeT6FpJrm8AF1btu6WH2k2Xhq6t5vbheKVfQavmeoZ")).toBe(
      "hashmyth",
    );
  });

  it("treats natural-language prompts as prompt jobs", () => {
    expect(
      detectAutoInputType(
        "A dead mall arcade wakes up after midnight and cuts its own trailer.",
      ),
    ).toBe("prompt");
  });
});
