export type MarketKind = "attention" | "research" | "prediction" | "compute";
export function scoreContribution(input: { quality: number; novelty: number; evidence: number }) {
  return Math.max(0, Math.min(100, input.quality * 0.5 + input.novelty * 0.3 + input.evidence * 0.2));
}
