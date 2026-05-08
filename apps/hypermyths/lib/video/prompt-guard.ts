const NO_TEXT_VIDEO_CONSTRAINT = [
  "HARD CONSTRAINT: Do not render any readable text in the video.",
  "No captions, subtitles, title cards, logos, watermarks, UI, or typography.",
  "Do not show readable words, letters, or numbers on signs/screens/overlays.",
  "If text-like shapes are unavoidable, keep them abstract and illegible.",
].join(" ");

const AUDIO_STYLE_CONSTRAINT = [
  "AUDIO CONSTRAINT: Include background music and cinematic sound effects.",
  "No dialogue, no narration, no spoken words, and no voiceover.",
  "No singing vocals, no chants, and no intelligible speech.",
  "Keep audio purely instrumental/atmospheric with non-verbal SFX.",
].join(" ");

function hasNoTextConstraint(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  return (
    normalized.includes("hard constraint: do not render any readable text") ||
    (normalized.includes("no captions") &&
      normalized.includes("no subtitles") &&
      normalized.includes("no readable text"))
  );
}

function hasAudioStyleConstraint(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  return (
    normalized.includes("audio constraint: include background music") ||
    (normalized.includes("no dialogue") &&
      normalized.includes("no narration") &&
      normalized.includes("no voiceover"))
  );
}

export function enforceNoTextVideoConstraint(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return NO_TEXT_VIDEO_CONSTRAINT;
  if (hasNoTextConstraint(trimmed)) return trimmed;
  return `${trimmed}\n\n${NO_TEXT_VIDEO_CONSTRAINT}`;
}

export function enforceAudioStyleConstraint(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return AUDIO_STYLE_CONSTRAINT;
  if (hasAudioStyleConstraint(trimmed)) return trimmed;
  return `${trimmed}\n\n${AUDIO_STYLE_CONSTRAINT}`;
}
