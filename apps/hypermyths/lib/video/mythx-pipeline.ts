// MythX video pipeline — integrates 90s Anime CRT engine with video rendering
// Takes N-act MythX prompts → generates scenes → renders via xAI → stitches into video

import { getEnv } from "@/lib/env";
import { renderCinematicVideo } from "@/lib/video/client";
import { buildXAiVideoRenderPayload } from "@/lib/video/xai";
import {
  generateMythXVideo as generateMythXEnginePrompts,
  type MythXResult,
  type MythXClipPrompt,
} from "@/workers/mythx-engine";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";
import { logger } from "@/lib/logging/logger";

// Build a WalletStory from X profile data for MythX
function buildMythXWalletStory(input: {
  username: string;
  tweetsText: string;
  displayName: string;
  profileUrl: string;
  transcript: string | null;
  durationSeconds: number;
}): WalletStory {
  return {
    wallet: input.username,
    storyKind: "mythx",
    subjectName: input.displayName || `@${input.username}`,
    subjectDescription: `Autobiography from @${input.username}'s tweets`,
    sourceMediaUrl: input.profileUrl,
    sourceMediaProvider: "x",
    sourceTranscript: input.transcript,
    audioEnabled: true,
    rangeDays: 1,
    packageType: "30s",
    durationSeconds: input.durationSeconds,
    analytics: {
      pumpTokensTraded: 0,
      buyCount: 0,
      sellCount: 0,
      solSpent: 0,
      solReceived: 0,
      estimatedPnlSol: 0,
      bestTrade: "N/A",
      worstTrade: "N/A",
      styleClassification: "crt_anime_90s",
    },
    timeline: [],
  };
}

// Build cinematic script from MythX 3-act prompts
function buildMythXCinematicScript(
  prompts: MythXClipPrompt[],
  story: WalletStory,
): GeneratedCinematicScript {
  return {
    hookLine: `@${story.subjectName} — a 90s anime CRT legend`,
    scenes: prompts.map((clip, i) => ({
      sceneNumber: i + 1,
      visualPrompt: clip.prompt,
      narration: `${story.subjectName} Act ${clip.act}: ${clip.prompt.slice(0, 200)}...`,
      durationSeconds: clip.durationSeconds,
      imageUrl: null,
    })),
  };
}

// Main: generate MythX video from X profile
export async function generateMythXVideo(input: {
  jobId: string;
  username: string;
  tweetsText: string;
  displayName: string;
  profileUrl: string;
  transcript: string | null;
  language?: string;
  isPremium?: boolean;
}): Promise<{
  mythxResult: MythXResult;
  videoUrl: string;
  thumbnailUrl: string | null;
  script: GeneratedCinematicScript;
}> {
  const {
    jobId,
    username,
    tweetsText,
    displayName,
    profileUrl,
    transcript,
    language,
    isPremium,
  } = input;

  const env = getEnv();
  const sceneCount = env.VIDEO_STITCH_SCENE_COUNT;

  // 1. Generate MythX N-act prompts with CRT physics
  const mythxResult = await generateMythXEnginePrompts({
    tweetsText,
    username,
    language,
    isPremium,
    actCount: sceneCount,
  });

  logger.info("mythx_prompts_generated", {
    component: "mythx_engine",
    username,
    jobId,
    acts: mythxResult.prompts.length,
    combo: mythxResult.combo,
  });

  // 2. Build WalletStory for pipeline
  const story = buildMythXWalletStory({
    username,
    tweetsText,
    displayName,
    profileUrl,
    transcript,
    durationSeconds: sceneCount * env.MYTHX_DURATION_SECONDS,
  });

  // 3. Build cinematic script from MythX prompts
  const script = buildMythXCinematicScript(mythxResult.prompts, story);

  // 4. Build xAI render payload — 480p, 1:1 square
  const xaiPayload = buildXAiVideoRenderPayload({
    walletStory: story,
    script,
    model: env.XAI_VIDEO_MODEL,
    resolution: "480p",
    aspectRatio: "1:1",
  });

  // 5. Render video via video-service
  const rendered = await renderCinematicVideo({
    jobId,
    wallet: username,
    durationSeconds: sceneCount * env.MYTHX_DURATION_SECONDS,
    prompt: xaiPayload.prompt,
    script,
    xai: xaiPayload,
  });

  logger.info("mythx_video_rendered", {
    component: "mythx_engine",
    username,
    jobId,
    videoUrl: rendered.videoUrl,
  });

  return {
    mythxResult,
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
    script,
  };
}
