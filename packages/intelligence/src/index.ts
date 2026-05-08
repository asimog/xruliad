import type { IntelligenceReport, ProductId, ResearchQuest, VideoScript } from "@hypermyths/types";

export function createMarketIntelligenceReport(input: { productId: ProductId; title: string; summary: string }): IntelligenceReport {
  return {
    id: crypto.randomUUID(),
    productId: input.productId,
    title: input.title,
    summary: input.summary,
    reportType: "market",
    signals: [],
    evidence: [],
    createdAt: new Date().toISOString()
  };
}

export function createResearchQuest(input: { productId: "cancerhawk" | "hyperkaon"; title: string; prompt: string; safetyNotes?: string[] }): ResearchQuest {
  return {
    id: crypto.randomUUID(),
    productId: input.productId,
    title: input.title,
    prompt: input.prompt,
    safetyNotes: input.safetyNotes,
    evidence: []
  };
}

export function createVideoScript(input: { productId: ProductId; title: string; thesis: string }): VideoScript {
  return {
    id: crypto.randomUUID(),
    productId: input.productId,
    title: input.title,
    hook: input.thesis,
    narration: [input.thesis],
    shotList: [{ scene: "Opening signal", visualPrompt: input.thesis }],
    captions: []
  };
}

export function createVideoScriptReport(script: VideoScript): IntelligenceReport {
  return {
    id: crypto.randomUUID(),
    productId: script.productId,
    title: script.title,
    summary: script.hook,
    reportType: "video_script",
    signals: [],
    videoScripts: [script],
    evidence: [],
    createdAt: new Date().toISOString()
  };
}
