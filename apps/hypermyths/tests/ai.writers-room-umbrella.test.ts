import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  generateTextInferenceJson: vi.fn(),
}));

vi.mock("@/lib/inference/text", () => ({
  generateTextInferenceJson: mocks.generateTextInferenceJson,
}));

describe("writers-room umbrella prompt usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects writers-room umbrella content in cinematic script generation", async () => {
    const { generateCinematicScript } = await import("@/lib/ai/cinematic");
    mocks.generateTextInferenceJson.mockResolvedValueOnce({
      hookLine: "A hook that lands hard.",
      scenes: [
        {
          sceneNumber: 1,
          visualPrompt: "Neon city opens with grounded specificity and tension.",
          narration: "Scene one narration with concrete details and momentum.",
          durationSeconds: 3,
        },
        {
          sceneNumber: 2,
          visualPrompt: "Middle act escalates with specific recurring motifs.",
          narration: "Scene two narration keeps the same protagonist and conflict.",
          durationSeconds: 3,
        },
        {
          sceneNumber: 3,
          visualPrompt: "Final payoff lands with earned emotional residue.",
          narration: "Scene three narration resolves the thread without clichés.",
          durationSeconds: 2,
        },
      ],
    });

    await generateCinematicScript({
      wallet: "generic:job-1",
      storyKind: "generic_cinema",
      subjectName: "Arcade Myth",
      subjectDescription: "A dead mall arcade wakes up after midnight.",
      requestedPrompt: "Turn this into a cinematic short with specific beats.",
      rangeDays: 1,
      packageType: "30s",
      durationSeconds: 8,
      analytics: {
        pumpTokensTraded: 0,
        buyCount: 0,
        sellCount: 0,
        solSpent: 0,
        solReceived: 0,
        estimatedPnlSol: 0,
        bestTrade: "n/a",
        worstTrade: "n/a",
        styleClassification: "Vaporwave Mall",
      },
      timeline: [],
    });

    const call = mocks.generateTextInferenceJson.mock.calls[0]?.[0];
    const systemPrompt = call?.messages?.[0]?.content ?? "";
    expect(systemPrompt).toContain("Writers-room umbrella guidance");
    expect(systemPrompt).toContain("# personalities");
  }, 15000);

  it("injects writers-room umbrella content in report summary generation", async () => {
    const { generateReportSummary } = await import("@/lib/ai/report");
    mocks.generateTextInferenceJson.mockResolvedValueOnce({
      summary: "A concise cinematic summary grounded in supplied facts.",
    });

    await generateReportSummary({
      jobId: "job-1",
      wallet: "generic:job-1",
      rangeDays: 1,
      subjectKind: "mythx",
      subjectName: "@mythx",
      pumpTokensTraded: 0,
      buyCount: 0,
      sellCount: 0,
      solSpent: 0,
      solReceived: 0,
      estimatedPnlSol: 0,
      bestTrade: "",
      worstTrade: "",
      styleClassification: "Biography Trailer",
      timeline: [],
    });

    const call = mocks.generateTextInferenceJson.mock.calls[0]?.[0];
    const systemPrompt = call?.messages?.[0]?.content ?? "";
    expect(systemPrompt).toContain("Writers-room umbrella guidance");
    expect(systemPrompt).toContain("# personalities");
    expect(systemPrompt).not.toContain("write about the memecoin itself rather than a wallet");
  }, 15000);
});
