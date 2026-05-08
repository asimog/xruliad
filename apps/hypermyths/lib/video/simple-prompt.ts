import type { JobDocument, ReportDocument } from "@/lib/types/domain";
import { getEnv } from "@/lib/env";

export function getSingleClipVideoSeconds(): number {
  return getEnv().SINGLE_CLIP_DURATION_SECONDS;
}

export function resolveSingleClipDurationSeconds(
  durationSeconds: number | null | undefined,
): number {
  const env = getEnv();
  const normalized = Math.floor(durationSeconds ?? env.SINGLE_CLIP_DURATION_SECONDS);
  return Math.max(env.VIDEO_MIN_DURATION_SECONDS, Math.min(env.VIDEO_MAX_DURATION_SECONDS, normalized));
}

function compactText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…`
    : trimmed;
}

export function buildSingleClipVideoPrompt(input: {
  job: JobDocument;
  report: ReportDocument;
}): string {
  const brief = compactText(
    input.job.requestedPrompt ??
      input.job.subjectDescription ??
      input.report.narrativeSummary ??
      input.report.summary,
    1_500,
  );
  const transcript = compactText(input.job.sourceTranscript, 1_800);
  const subjectName = compactText(input.job.subjectName, 120);
  const styleLabel = compactText(input.report.styleLabel, 120);
  const sourceUrl = compactText(input.job.sourceMediaUrl, 500);
  const storyBeatCues = (input.report.storyCards ?? [])
    .slice(0, 3)
    .map((card) => {
      const cue = compactText(
        card.narrationCue ?? card.teaser ?? card.visualCue,
        180,
      );
      if (!cue) return null;
      return `${card.phase}: ${cue}`;
    })
    .filter((cue): cue is string => Boolean(cue));
  const durationSeconds = resolveSingleClipDurationSeconds(input.job.videoSeconds);

  return [
    `Create one cohesive ${durationSeconds}-second cinematic video as a single finished clip.`,
    subjectName ? `Subject: ${subjectName}.` : null,
    brief ? `Creative brief: ${brief}` : null,
    styleLabel ? `Visual finish: ${styleLabel}.` : null,
    transcript ? `Reference transcript excerpt: ${transcript}` : null,
    storyBeatCues.length
      ? `Story beat cues (must remain visible in the final clip): ${storyBeatCues.join(" | ")}`
      : null,
    sourceUrl ? `Reference URL: ${sourceUrl}.` : null,
    "Audio direction: include cinematic background music and environmental sound effects.",
    "No dialogue, no narration, no voiceover, and no intelligible vocals.",
    "Important: deliver one visually coherent clip only. Do not split the story into acts, separate scenes, or stitched segments.",
    "Hard constraint: never include any readable on-screen text.",
    "No captions, subtitles, title cards, logos, watermarks, UI, readable signs, or readable words/letters/numbers in-frame.",
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export function buildMultiActVideoPrompt(input: {
  job: JobDocument;
  report: ReportDocument;
  sceneCount: number;
}): string {
  const sceneCount = input.sceneCount;
  const brief = compactText(
    input.job.requestedPrompt ??
      input.job.subjectDescription ??
      input.report.narrativeSummary ??
      input.report.summary,
    1_500,
  );
  const transcript = compactText(input.job.sourceTranscript, 1_800);
  const subjectName = compactText(input.job.subjectName, 120);
  const styleLabel = compactText(input.report.styleLabel, 120);
  const sourceUrl = compactText(input.job.sourceMediaUrl, 500);
  const storyBeatCues = (input.report.storyCards ?? [])
    .slice(0, 3)
    .map((card) => {
      const cue = compactText(
        card.narrationCue ?? card.teaser ?? card.visualCue,
        180,
      );
      if (!cue) return null;
      return `${card.phase}: ${cue}`;
    })
    .filter((cue): cue is string => Boolean(cue));
  return [
    `Create a stitched ${sceneCount}-act cinematic short with exactly ${sceneCount} scenes: an opening setup, ${sceneCount > 2 ? `${sceneCount - 2} development beat${sceneCount - 2 === 1 ? "" : "s"}, ` : ""}and a climactic final reveal.`,
    subjectName ? `Subject: ${subjectName}.` : null,
    brief ? `Creative brief: ${brief}` : null,
    styleLabel ? `Visual finish: ${styleLabel}.` : null,
    transcript ? `Reference transcript excerpt: ${transcript}` : null,
    storyBeatCues.length
      ? `Story beat cues for the stitched arc: ${storyBeatCues.join(" | ")}`
      : null,
    sourceUrl ? `Reference URL: ${sourceUrl}.` : null,
    "Audio direction: include cinematic background music and environmental sound effects across all acts.",
    "No dialogue, no narration, no voiceover, and no intelligible vocals.",
    `Important: return material that is meant to be split into ${sceneCount} coherent visual scenes and stitched into one final video.`,
    "Do not collapse the whole story into one shot.",
    "Hard constraint: never include any readable on-screen text.",
    "No captions, subtitles, title cards, logos, watermarks, UI, readable signs, or readable words/letters/numbers in-frame.",
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}
