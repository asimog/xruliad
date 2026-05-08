import {
  buildMultiActVideoPrompt,
  buildSingleClipVideoPrompt,
  resolveSingleClipDurationSeconds,
} from "@/lib/video/simple-prompt";
import { describe, expect, it } from "vitest";

const baseJob = {
  jobId: "job-1",
  wallet: "generic_cinema:job-1",
  requestKind: "generic_cinema" as const,
  subjectName: "Arcade Myth",
  subjectDescription: "A dead mall arcade wakes up after midnight.",
  requestedPrompt:
    "A dead mall arcade wakes up after midnight and makes its own trailer.",
  sourceTranscript: null,
  packageType: "30s" as const,
  rangeDays: 1,
  priceSol: 0,
  priceUsdc: 0,
  videoSeconds: 12,
  status: "processing" as const,
  progress: "generating_video" as const,
  txSignature: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  errorCode: null,
  errorMessage: null,
};

const baseReport = {
  jobId: "job-1",
  wallet: "generic_cinema:job-1",
  rangeDays: 1,
  summary: "A compact mythic trailer about a haunted arcade.",
  narrativeSummary: "The arcade turns itself into legend in one night.",
  styleLabel: "Vaporwave Mall",
  pumpTokensTraded: 0,
  buyCount: 0,
  sellCount: 0,
  solSpent: 0,
  solReceived: 0,
  estimatedPnlSol: 0,
  bestTrade: "",
  worstTrade: "",
  styleClassification: "Vaporwave Mall",
  storyCards: [
    {
      id: "hook-1",
      phase: "hook" as const,
      title: "Hook 1",
      teaser: "The lights flicker before the first machine boots.",
      visualCue: "Neon cabinets wake up in sequence.",
      narrationCue: "The mall remembers a crowd that never came back.",
      transitionLabel: "Push deeper into the arcade.",
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
} as never;

describe("simple prompt video helpers", () => {
  it("clamps the single clip duration to the configured single-clip range", () => {
    expect(resolveSingleClipDurationSeconds(undefined)).toBe(4);
    expect(resolveSingleClipDurationSeconds(30)).toBe(10);
    expect(resolveSingleClipDurationSeconds(1)).toBe(3);
  });

  it("builds a single-clip prompt without stitched-scene instructions", () => {
    const prompt = buildSingleClipVideoPrompt({
      job: baseJob,
      report: baseReport,
    });

    expect(prompt).toContain("10-second");
    expect(prompt).toContain("single finished clip");
    expect(prompt).toContain("Arcade Myth");
    expect(prompt).toContain("Vaporwave Mall");
    expect(prompt).toContain("Story beat cues");
    expect(prompt).toContain("hook:");
    expect(prompt).toContain("Do not split the story into acts");
  });

  it("builds a dedicated stitched prompt for two-scene jobs", () => {
    const prompt = buildMultiActVideoPrompt({
      job: {
        ...baseJob,
        experience: "two_act_cinema",
        videoSeconds: 30,
      },
      report: baseReport,
      sceneCount: 2,
    });

    expect(prompt).toContain("stitched 2-act cinematic short");
    expect(prompt).toContain("exactly 2 scenes");
    expect(prompt).toContain("stitched arc");
    expect(prompt).toContain("split into 2 coherent visual scenes");
    expect(prompt).not.toContain("single finished clip");
    expect(prompt).not.toContain("Do not split the story into acts");
  });
});
