export type ShotListItem = { scene: string; visualPrompt: string; durationSeconds?: number };
export type VisualPrompt = { prompt: string; negativePrompt?: string; style?: string };
export function createShot(scene: string, visualPrompt: string): ShotListItem {
  return { scene, visualPrompt };
}
