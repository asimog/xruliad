// Simple test endpoint: generate 3 videos via OpenRouter → xAI pipeline
// Each video is ~8-10 seconds, combined into a ~30 second experience
// GATED: Requires ADMIN_SECRET to prevent cost abuse ($15+/request).
import { NextRequest, NextResponse } from "next/server";
import { generateTextInferenceJson } from "@/lib/inference/text";
import { renderWithxAI } from "@/lib/agents/producer";
import { logger } from "@/lib/logging/logger";
import { getEnv } from "@/lib/env";
import { secureCompare } from "@/lib/security/crypto";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for 3 video generations

const RANDOM_PROMPTS = [
  "A synthetic prophet broadcasts warnings from a flooded neon city and nobody can tell if the visions are real.",
  "A dead mall arcade wakes up after midnight and decides to produce its own mythic trailer.",
  "A luxury space hotel drifts past Saturn while one guest quietly plans an impossible escape.",
  "A small town receives a weather report from thirty years in the future and starts changing overnight.",
  "A lost VHS tape contains a trailer for an event that has not happened yet.",
];

export async function POST(request: NextRequest) {
  const adminSecret = getEnv().ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token || !secureCompare(token, adminSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prompt =
    RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];

  logger.info("simple_pipeline_start", { prompt });

  // Step 1: Use OpenRouter to generate a 3-act cinematic script
  let script: {
    hookLine: string;
    scenes: Array<{
      sceneNumber: number;
      visualPrompt: string;
      narration: string;
      durationSeconds: number;
    }>;
  };
  try {
    script = await generateTextInferenceJson({
      temperature: 0.82,
      maxTokens: 1600,
      messages: [
        {
          role: "system",
          content: `You are a cinematic script generator. Return ONLY valid JSON with exactly two keys: "hookLine" (string) and "scenes" (array of exactly 3 objects).
Each scene object must have: "sceneNumber" (1,2,3), "visualPrompt" (string with vivid visual description for AI video generation, minimum 50 characters), "narration" (string with voiceover text, minimum 20 characters), "durationSeconds" (number around 10).
The visualPrompt should be detailed enough for a video AI model to generate from. Each scene should be visually distinct but part of a coherent story arc.
Act 1: Setup/Opening image. Act 2: Escalation/Turning point. Act 3: Resolution/Final image.
No extra text, no markdown, no code blocks. Just raw JSON.`,
        },
        {
          role: "user",
          content: `Create a 3-act cinematic video (~30 seconds total) based on this concept: ${prompt}`,
        },
      ],
    });

    logger.info("simple_pipeline_script_generated", {
      hookLine: script.hookLine,
      sceneCount: script.scenes.length,
    });
  } catch (scriptError) {
    logger.error("simple_pipeline_script_failed", {
      error:
        scriptError instanceof Error
          ? scriptError.message
          : String(scriptError),
    });
    return NextResponse.json(
      {
        error: "Script generation failed",
        message: scriptError instanceof Error ? scriptError.message : "Unknown",
      },
      { status: 500 },
    );
  }

  // Step 2: Generate 3 separate videos from xAI (one per scene)
  const videos: string[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    logger.info("simple_pipeline_rendering_scene", {
      sceneNumber: scene.sceneNumber,
      prompt: scene.visualPrompt.slice(0, 80),
    });

    let videoResult;
    try {
      videoResult = await renderWithxAI(scene.visualPrompt, "16:9", 10);
    } catch (renderError) {
      logger.error("simple_pipeline_scene_failed", {
        sceneNumber: scene.sceneNumber,
        error:
          renderError instanceof Error
            ? renderError.message
            : String(renderError),
      });
      return NextResponse.json(
        {
          error: `Video generation failed for scene ${scene.sceneNumber}`,
          message:
            renderError instanceof Error ? renderError.message : "Unknown",
        },
        { status: 500 },
      );
    }

    if (!videoResult.success || !videoResult.videoUrl) {
      logger.error("simple_pipeline_no_video", {
        sceneNumber: scene.sceneNumber,
        error: videoResult.error,
      });
      return NextResponse.json(
        {
          error: `Video generation failed for scene ${scene.sceneNumber}`,
          message: videoResult.error || "No video URL returned",
        },
        { status: 500 },
      );
    }

    videos.push(videoResult.videoUrl);
    logger.info("simple_pipeline_scene_complete", {
      sceneNumber: scene.sceneNumber,
      videoUrl: videoResult.videoUrl.slice(0, 80),
    });
  }

  logger.info("simple_pipeline_complete", { videoCount: videos.length });

  return NextResponse.json({
    success: true,
    prompt,
    hookLine: script.hookLine,
    sceneCount: script.scenes.length,
    scenes: script.scenes.map((s, i) => ({
      sceneNumber: s.sceneNumber,
      narration: s.narration,
      videoUrl: videos[i],
    })),
    videos, // Array of 3 video URLs - play sequentially for full ~30s experience
    totalDuration: script.scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
  });
}
