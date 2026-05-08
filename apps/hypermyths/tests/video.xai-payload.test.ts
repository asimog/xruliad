import { describe, expect, it } from "vitest";
import { buildXAiVideoRenderPayload } from "@/lib/video/xai";

describe("xAI video payload builder", () => {
  it("defaults to the lowest supported xAI resolution", () => {
    const payload = buildXAiVideoRenderPayload({
      walletStory: {
        wallet: "wallet-1",
        storyKind: "generic_cinema",
        visibility: "public",
        rangeDays: 1,
        packageType: "30s",
        durationSeconds: 30,
        analytics: {
          pumpTokensTraded: 0,
          buyCount: 0,
          sellCount: 0,
          solSpent: 0,
          solReceived: 0,
          estimatedPnlSol: 0,
          bestTrade: "N/A",
          worstTrade: "N/A",
          styleClassification: "cinematic",
        },
        timeline: [],
      },
      script: {
        hookLine: "Hook",
        scenes: [
          {
            sceneNumber: 1,
            visualPrompt: "visual prompt",
            narration: "narration",
            durationSeconds: 10,
            imageUrl: null,
          },
        ],
      },
    });

    expect(payload.resolution).toBe("480p");
    expect(payload.aspectRatio).toBe("1:1");
  });

  it("normalizes explicit non-square requests back to the square xAI profile", () => {
    const payload = buildXAiVideoRenderPayload({
      walletStory: {
        wallet: "wallet-1",
        storyKind: "generic_cinema",
        visibility: "public",
        rangeDays: 1,
        packageType: "30s",
        durationSeconds: 30,
        analytics: {
          pumpTokensTraded: 0,
          buyCount: 0,
          sellCount: 0,
          solSpent: 0,
          solReceived: 0,
          estimatedPnlSol: 0,
          bestTrade: "N/A",
          worstTrade: "N/A",
          styleClassification: "cinematic",
        },
        timeline: [],
      },
      script: {
        hookLine: "Hook",
        scenes: [
          {
            sceneNumber: 1,
            visualPrompt: "visual prompt",
            narration: "narration",
            durationSeconds: 10,
            imageUrl: null,
          },
        ],
      },
      resolution: "720p",
      aspectRatio: "9:16",
    });

    expect(payload.resolution).toBe("480p");
    expect(payload.aspectRatio).toBe("1:1");
  });
});
