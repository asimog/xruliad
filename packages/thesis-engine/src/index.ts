import { createExecutionIntent } from "@hypermyths/local-trading";
import type { ProductId } from "@hypermyths/theme";

export type ThesisType = "market" | "prediction" | "RWA" | "cancer_research" | "physics_research" | "ad_attention" | "video_script" | "code_strategy" | "model_evaluation";
export type ThesisEvidence = { id: string; title: string; url?: string; note?: string };
export type ThesisModelOutput = { id: string; modelRoute: string; summary: string; costUsd?: number };
export type ThesisSimulation = { id: string; summary: string; risks: string[] };
export type ThesisMediaArtifact = { id: string; kind: "video_script" | "video" | "image" | "audio"; url?: string; summary: string };
export type ThesisAdPlacement = { id: string; surface: string; sponsorMetadataVisible: true };
export type ThesisResearchTask = { id: string; prompt: string; productId: "cancerhawk" | "hyperkaon" };
export type ThesisExecutionIntent = ReturnType<typeof createExecutionIntent>;
export type ThesisContribution = { id: string; contributor: string; payload: ThesisEvidence | ThesisModelOutput | ThesisSimulation | ThesisMediaArtifact | ThesisAdPlacement | ThesisResearchTask };
export type Thesis = { id: string; productId: ProductId; type: ThesisType; title: string; claim: string; visibility: "public" | "private" | "permissioned"; createdAt: string };
export type ThesisRun = { id: string; thesisId: string; status: "prepared" | "running" | "complete" | "failed"; outputs: ThesisContribution[] };

export function createThesis(input: Omit<Thesis, "id" | "createdAt">): Thesis {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function runThesis(thesis: Thesis): ThesisRun {
  return { id: crypto.randomUUID(), thesisId: thesis.id, status: "prepared", outputs: [] };
}

export function exportLocalTradeIntent(thesis: Thesis): ThesisExecutionIntent {
  return createExecutionIntent({ thesisId: thesis.id, venue: "paper", asset: thesis.title, side: "simulate", rationale: thesis.claim });
}
