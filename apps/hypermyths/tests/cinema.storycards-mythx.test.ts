import { describe, expect, it } from "vitest";
import { buildStoryCards } from "@/lib/cinema/storyCards";

describe("buildStoryCards MythX transcript derivation", () => {
  it("derives cues from numbered transcript lines before generic fallback", () => {
    const cards = buildStoryCards({
      requestKind: "mythx",
      subjectName: "@mythx",
      requestedPrompt: null,
      sourceTranscript: [
        "1. shipped the feature after getting roasted",
        "2. doubled down while everyone said it was over",
        "3. posted receipts and called out copycats",
      ].join("\n"),
      scenes: 3,
    });

    expect(cards).toHaveLength(3);
    expect(cards[0]?.teaser).toContain("Tweet evidence #1");
    expect(cards[1]?.teaser).toContain("Tweet evidence #2");
    expect(cards[2]?.teaser).toContain("Tweet evidence #3");
    expect(cards[0]?.teaser).not.toContain("opens with an immediate cinematic hook");
  });
});
