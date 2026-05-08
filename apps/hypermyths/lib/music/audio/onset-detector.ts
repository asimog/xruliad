export function detectOnset(current: number, avg: number): boolean {
  if (avg <= 0) return current > 0.15;
  return current > avg * 1.3;
}
