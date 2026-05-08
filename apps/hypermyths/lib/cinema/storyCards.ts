import type { JobRequestKind, StoryCard } from "@/lib/types/domain";

interface StoryCardInput {
  requestKind?: JobRequestKind;
  subjectName?: string | null;
  subjectDescription?: string | null;
  requestedPrompt?: string | null;
  sourceTranscript?: string | null;
  sourceReferenceLabel?: string | null;
  storyBeats?: string[] | null;
  audioEnabled?: boolean | null;
  scenes?: number;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function compact(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1).trimEnd()}…`;
}

function parseNumberedTweetLines(
  transcript: string | null | undefined,
): Array<{ index: number; text: string }> {
  const normalized = clean(transcript);
  if (!normalized) return [];

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s*[\).:-]?\s+(.+)$/);
      if (!match) return null;
      return {
        index: Number.parseInt(match[1]!, 10),
        text: match[2]!.trim(),
      };
    })
    .filter(
      (line): line is { index: number; text: string } =>
        Boolean(line && line.text.length > 0 && Number.isFinite(line.index)),
    );
}

function buildMythXTranscriptCues(input: {
  transcript: string | null | undefined;
  subject: string;
  targetCount: number;
}): string[] {
  const tweets = parseNumberedTweetLines(input.transcript);
  if (!tweets.length) return [];

  const scaleIndex = (index: number): number => {
    if (tweets.length <= 1 || input.targetCount <= 1) return 0;
    return Math.round((index * (tweets.length - 1)) / (input.targetCount - 1));
  };

  const selected = Array.from({ length: Math.min(input.targetCount, tweets.length) }, (_, index) => {
    const tweet = tweets[scaleIndex(index)];
    return tweet
      ? `Tweet evidence #${tweet.index}: ${compact(tweet.text, 180)}`
      : null;
  }).filter((line): line is string => Boolean(line));

  return [...new Set(selected)].map(
    (line, index) =>
      `${input.subject} beat ${index + 1}: ${line}. Convert this into character motion, visual metaphor, and emotional progression.`,
  );
}

function makeCard(
  phase: StoryCard["phase"],
  index: number,
  cue: string,
  subject: string,
): StoryCard {
  return {
    id: `${phase}-${index + 1}`,
    phase,
    title: `${phase[0]!.toUpperCase()}${phase.slice(1)} ${index + 1}`,
    teaser: cue,
    visualCue: `${subject}: ${cue}`,
    narrationCue: cue,
    transitionLabel: "Carry continuity into the next beat.",
  };
}

export function buildStoryCards(input: StoryCardInput): StoryCard[] {
  const subject = clean(input.subjectName) ?? "The story";
  const targetCount = Math.max(3, Math.min(6, input.scenes ?? 4));
  // Lines that start with a directive label (e.g. "Format:", "Subject:", "Evidence scope:",
  // "Direction:") are internal prompt instructions, not story content. Strip them when the
  // requestedPrompt is used as a story-beat fallback, otherwise they leak into visual cues.
  const DIRECTIVE_RE = /^(format|subject|evidence\s+scope|direction|evidence|source|style|pipeline|act|scene)\s*:/i;
  const beats =
    input.storyBeats?.map((b) => b.trim()).filter(Boolean) ??
    clean(input.requestedPrompt)
      ?.split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => Boolean(line) && !DIRECTIVE_RE.test(line)) ??
    [];
  const transcriptBeats =
    input.requestKind === "mythx" && beats.length < targetCount
      ? buildMythXTranscriptCues({
          transcript: input.sourceTranscript,
          subject,
          targetCount,
        })
      : [];
  const combinedBeats = [...beats];

  for (const transcriptBeat of transcriptBeats) {
    if (combinedBeats.length >= targetCount) break;
    if (!combinedBeats.includes(transcriptBeat)) {
      combinedBeats.push(transcriptBeat);
    }
  }

  const fallback = [
    `${subject} opens with an immediate cinematic hook.`,
    `The middle escalates with emotional and visual contrast.`,
    `The payoff lands on a memorable closing frame.`,
    `The final beat leaves a strong continuation pull.`,
  ];
  const phases: StoryCard["phase"][] = ["hook", "build", "payoff", "continuation"];

  // When beats has fewer entries than targetCount, pad with fallback so cards
  // don't all repeat the same single-line prompt cue.
  return Array.from({ length: targetCount }, (_, index) => {
    const cue =
      (combinedBeats.length > 0 ? combinedBeats[index] : undefined) ??
      (transcriptBeats.length > 0 ? transcriptBeats[index] : undefined) ??
      fallback[index] ??
      fallback[fallback.length - 1]!;
    const phase = phases[Math.min(index, phases.length - 1)]!;
    return makeCard(phase, index, cue, subject);
  });
}

export function buildContinuationPrompt(input: StoryCardInput | string): string {
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed ? `Continue from: ${trimmed.slice(0, 280)}` : "";
  }

  const parts = [
    clean(input.subjectName),
    clean(input.subjectDescription),
    clean(input.requestedPrompt),
    clean(input.sourceReferenceLabel),
    clean(input.sourceTranscript)?.slice(0, 300),
  ].filter((value): value is string => Boolean(value));

  const beats = input.storyBeats?.filter(Boolean) ?? [];
  const beatText = beats.length > 0 ? ` Beats: ${beats.join(" | ")}` : "";
  const body = parts.join(" | ");
  return body ? `Continue cinematic coherence from: ${body}.${beatText}` : "";
}
