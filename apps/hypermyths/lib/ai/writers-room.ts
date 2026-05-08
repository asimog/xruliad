import { readFile } from "fs/promises";
import path from "path";

const WRITERS_ROOM_PROMPT_PATH = path.join(
  process.cwd(),
  "prompts",
  "writers_room_content_bank.md",
);
const DEFAULT_EXCERPT_CHARS = 6_500;

let cachedWritersRoomContentPromise: Promise<string> | null = null;

function clampExcerpt(content: string, maxChars: number): string {
  const normalized = content.trim();
  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;

  const boundary = normalized.lastIndexOf("\n", maxChars);
  const safeCutoff = boundary >= Math.floor(maxChars * 0.7) ? boundary : maxChars;
  return `${normalized.slice(0, safeCutoff).trimEnd()}\n...`;
}

async function loadWritersRoomContent(): Promise<string> {
  try {
    return await readFile(WRITERS_ROOM_PROMPT_PATH, "utf8");
  } catch {
    return "";
  }
}

export async function loadWritersRoomSystemExcerpt(
  maxChars = DEFAULT_EXCERPT_CHARS,
): Promise<string> {
  if (!cachedWritersRoomContentPromise) {
    cachedWritersRoomContentPromise = loadWritersRoomContent();
  }

  const content = await cachedWritersRoomContentPromise;
  const excerpt = clampExcerpt(content, Math.max(800, maxChars));
  if (!excerpt) {
    return "";
  }

  return [
    "Writers-room umbrella guidance (use as tonal and structural direction):",
    excerpt,
  ].join("\n");
}
