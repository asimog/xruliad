// Video pipeline — generates a script and renders through the active provider chain
import { generateCinematicScript } from "@/lib/ai/cinematic";
import { renderCinematicVideoWithFallback } from "@/lib/video/dispatcher";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";
import { logger } from "@/lib/logging/logger";

// Generate cinematic script, render via xAI, return URLs
export async function buildAndRenderVideo(input: {
  jobId: string;
  walletStory: WalletStory;
  imageUrl?: string | null;
}): Promise<{
  script: GeneratedCinematicScript;
  videoUrl: string;
  thumbnailUrl: string | null;
}> {
  // AI generates scene plan and narration
  const script = await generateCinematicScript(input.walletStory);

  // Combine all visual prompts into one render request
  const visualPrompt = script.scenes
    .map((s) => `Scene ${s.sceneNumber}: ${s.visualPrompt}`)
    .join(". ");

  logger.info("pipeline_starting_video_render", {
    component: "video_pipeline",
    jobId: input.jobId,
    prompt: visualPrompt.slice(0, 100),
    duration: input.walletStory.durationSeconds,
  });

  const rendered = await renderCinematicVideoWithFallback({
    jobId: input.jobId,
    wallet: input.walletStory.wallet,
    durationSeconds: input.walletStory.durationSeconds,
    prompt: visualPrompt,
    subjectName: input.walletStory.subjectName,
    sourceTranscript: input.walletStory.sourceTranscript,
    imageUrl: input.imageUrl ?? undefined,
  });

  logger.info("pipeline_video_render_success", {
    component: "video_pipeline",
    jobId: input.jobId,
    provider: rendered.provider,
    videoUrl: rendered.videoUrl,
  });

  return {
    script,
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
  };
}
