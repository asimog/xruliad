// Multi-act stitch pipeline. Renders scene clips and stitches them into a
// single final.mp4 uploaded to Supabase.
// through the provider fallback chain, downloads them locally, and stitches
// them into a single final.mp4 uploaded to Supabase.
import { generateTextInferenceJson } from "@/lib/inference/text";
import { renderCinematicVideoWithFallback } from "@/lib/video/dispatcher";
import { logger } from "@/lib/logging/logger";
import { getEnv } from "@/lib/env";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  extractS3KeyFromUrl,
  generateSignedVideoUrl,
  getProviderAuthHeaders,
  uploadLocalFileToStorage,
} from "@/lib/storage/s3";
import { isSafeUrl } from "@/lib/security/crypto";

const env = getEnv();
const MULTI_ACT_SCENE_SECONDS = env.MULTI_SCENE_DURATION_SECONDS;
const MULTI_ACT_STITCH_FPS = 24;
const MULTI_ACT_TRANSITION_SECONDS = 0.5;
const FALLBACK_STITCH_WIDTH = 1280;
const FALLBACK_STITCH_HEIGHT = 720;
const FALLBACK_STITCH_THREADS = Math.max(
  1,
  Number.parseInt(process.env.FFMPEG_STITCH_THREADS ?? "2", 10) || 2,
);
const MULTI_ACT_TRANSITION_FRAMES = Math.round(
  MULTI_ACT_STITCH_FPS * MULTI_ACT_TRANSITION_SECONDS,
);

export async function generateMultiActVideo(input: {
  prompt: string;
  jobId: string;
  sceneCount: number;
  imageUrl?: string | null;
  onProgress?: (progress: string) => Promise<void>;
}): Promise<{
  videoUrl: string;
  thumbnailUrl: null;
  hookLine: string;
  scenes: Array<{
    sceneNumber: number;
    narration: string;
    visualPrompt: string;
    individualVideoUrl: string;
  }>;
  totalDuration: number;
}> {
  const tmpDir = path.join(
    os.tmpdir(),
    `hypercinema-${input.jobId}-${Date.now()}`,
  );
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    await input.onProgress?.("generating_script");

    // Generate the stitch script.
    logger.info("multi_act_script_generation", {
      jobId: input.jobId,
      prompt: input.prompt.slice(0, 80),
    });

    const script = await generateTextInferenceJson<{
      hookLine: string;
      scenes: Array<{
        sceneNumber: number;
        visualPrompt: string;
        narration: string;
        durationSeconds: number;
      }>;
    }>({
      temperature: 0.82,
      maxTokens: 1600,
      messages: [
        {
          role: "system",
          content: `You are a cinematic script generator. Return ONLY valid JSON with exactly two keys: "hookLine" (string) and "scenes" (array of exactly ${input.sceneCount} objects).
Each scene object must have: "sceneNumber" (1 to ${input.sceneCount}), "visualPrompt" (string with vivid visual description for AI video generation, minimum 50 characters), "narration" (string describing non-verbal audio mood cues only, minimum 20 characters), "durationSeconds" (number around ${MULTI_ACT_SCENE_SECONDS}).
The visualPrompt should be detailed enough for a video AI model to generate from. Each scene should be visually distinct but part of a coherent story arc.
Act 1: Opening/Setup — establish the world, subject, and visual atmosphere. ${input.sceneCount > 2 ? `Acts 2-${input.sceneCount - 1}: Development — build tension and stakes. ` : ""}Act ${input.sceneCount}: Climax/Resolution — escalate to a powerful final image with payoff.
Hard constraint for visualPrompt: never request readable on-screen text, captions, subtitles, logos, watermarks, UI, or readable words/letters/numbers.
Hard audio constraint: include cinematic background music and atmospheric SFX only. No spoken dialogue, narration, voiceover, or intelligible singing.
No extra text, no markdown, no code blocks. Just raw JSON.`,
        },
        {
          role: "user",
          content: `Create a ${input.sceneCount}-act cinematic video (~${input.sceneCount * MULTI_ACT_SCENE_SECONDS} seconds total, ~${MULTI_ACT_SCENE_SECONDS} seconds per scene) based on this concept: ${input.prompt}`,
        },
      ],
    });

    const scenes = normalizeScenes(script.scenes, input.sceneCount);

    logger.info("multi_act_script_generated", {
      jobId: input.jobId,
      hookLine: script.hookLine,
      sceneCount: scenes.length,
    });

    // Render both source clips.
    const videoFiles: string[] = [];
    const sceneDetails: Array<{
      sceneNumber: number;
      narration: string;
      visualPrompt: string;
      individualVideoUrl: string;
    }> = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      await input.onProgress?.("rendering_scenes");
      logger.info("multi_act_rendering_scene", {
        jobId: input.jobId,
        sceneNumber: scene.sceneNumber,
        prompt: scene.visualPrompt.slice(0, 80),
      });

      const videoResult = await renderCinematicVideoWithFallback({
        jobId: `${input.jobId}-scene-${scene.sceneNumber}`,
        wallet: "multi-act-pipeline",
        durationSeconds: Math.max(
          env.VIDEO_MIN_DURATION_SECONDS,
          scene.durationSeconds || MULTI_ACT_SCENE_SECONDS,
        ),
        prompt: scene.visualPrompt,
        subjectName: input.jobId,
        imageUrl: input.imageUrl ?? undefined,
      });

      if (!videoResult.videoUrl) {
        throw new Error(`Scene ${scene.sceneNumber} failed: No video URL`);
      }

      // Cache the rendered clip.
      const localPath = path.join(tmpDir, `scene-${scene.sceneNumber}.mp4`);
      await downloadVideo(videoResult.videoUrl, localPath);

      videoFiles.push(localPath);
      sceneDetails.push({
        sceneNumber: scene.sceneNumber,
        narration: scene.narration,
        visualPrompt: scene.visualPrompt,
        individualVideoUrl: videoResult.videoUrl,
      });

      logger.info("multi_act_scene_complete", {
        jobId: input.jobId,
        sceneNumber: scene.sceneNumber,
        videoUrl: videoResult.videoUrl.slice(0, 80),
      });
    }

    // Stitch the rendered clips.
    logger.info("multi_act_stitching", {
      jobId: input.jobId,
      videoCount: videoFiles.length,
    });
    await input.onProgress?.("stitching_video");

    const outputPath = path.join(tmpDir, "combined.mp4");
    const stitchedDuration = await stitchVideos(
      videoFiles,
      outputPath,
      scenes.map((scene) => scene.durationSeconds || MULTI_ACT_SCENE_SECONDS),
    );

    // Confirm the stitched file exists.
    const stats = await fs.stat(outputPath);
    logger.info("multi_act_stitched", {
      jobId: input.jobId,
      fileSizeBytes: stats.size,
      stitchedDurationSeconds: stitchedDuration,
    });

    // Upload the stitched file.
    const storagePath = `video-renders/${input.jobId}/final.mp4`;
    const combinedVideoUrl = await uploadLocalFileToStorage(
      outputPath,
      storagePath,
    );
    if (!combinedVideoUrl) {
      throw new Error("Combined multi-act video could not be stored.");
    }

    logger.info("multi_act_uploaded", {
      jobId: input.jobId,
      combinedVideoUrl,
    });

    return {
      videoUrl: combinedVideoUrl,
      thumbnailUrl: null,
      hookLine: script.hookLine,
      scenes: sceneDetails,
      totalDuration: stitchedDuration,
    };
  } finally {
    // Remove temporary files.
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function normalizeScenes(
  scenes: Array<{
    sceneNumber: number;
    visualPrompt: string;
    narration: string;
    durationSeconds: number;
  }>,
  sceneCount: number,
): Array<{
  sceneNumber: number;
  visualPrompt: string;
  narration: string;
  durationSeconds: number;
}> {
  const usable = scenes
    .filter(
      (scene) =>
        typeof scene?.visualPrompt === "string" &&
        scene.visualPrompt.trim().length > 0 &&
        typeof scene?.narration === "string" &&
        scene.narration.trim().length > 0,
    )
    .slice(0, sceneCount)
    .map((scene, index) => ({
      sceneNumber: index + 1,
      visualPrompt: scene.visualPrompt.trim(),
      narration: scene.narration.trim(),
      durationSeconds: MULTI_ACT_SCENE_SECONDS,
    }));

  if (usable.length === sceneCount) {
    return usable;
  }

  const fallbackSeed =
    usable[usable.length - 1] ?? {
      sceneNumber: 1,
      visualPrompt:
        "A cinematic establishing shot that evolves into a mythic character portrait with rich motion and dramatic lighting.",
      narration:
        "A figure emerges from static into legend, framed like a memory the internet refuses to forget.",
      durationSeconds: MULTI_ACT_SCENE_SECONDS,
    };

  while (usable.length < sceneCount) {
    const nextIndex = usable.length + 1;
    usable.push({
      sceneNumber: nextIndex,
      visualPrompt: `${fallbackSeed.visualPrompt} Transition into act ${nextIndex} with escalating visual stakes and a powerful final image.`,
      narration: `${fallbackSeed.narration} Build to a climactic payoff in act ${nextIndex}.`,
      durationSeconds: MULTI_ACT_SCENE_SECONDS,
    });
  }

  return usable;
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  let resolvedUrl = url;
  const storageKey = extractS3KeyFromUrl(url);
  if (storageKey) {
    const signedUrl = await generateSignedVideoUrl(storageKey);
    if (signedUrl) {
      resolvedUrl = signedUrl;
    }
  }

  if (!isSafeUrl(resolvedUrl)) {
    throw new Error(`Refusing to fetch video from unsafe URL: ${resolvedUrl.slice(0, 120)}`);
  }

  // Provider CDNs (OpenRouter, xAI, Replicate) gate downloads behind auth even
  // when the URL looks public. Attach the right Authorization header for the
  // host before fetching.
  const headers: Record<string, string> = getProviderAuthHeaders(resolvedUrl);

  let response = await fetch(resolvedUrl, { headers });
  if (!response.ok && resolvedUrl !== url && storageKey) {
    if (!isSafeUrl(url)) {
      throw new Error(`Refusing to fetch video from unsafe fallback URL: ${url.slice(0, 120)}`);
    }
    response = await fetch(url, { headers: getProviderAuthHeaders(url) });
  }
  if (!response.ok) {
    throw new Error(
      `Failed to download video: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

async function stitchVideos(
  inputPaths: string[],
  outputPath: string,
  expectedSceneDurationsSeconds: number[],
): Promise<number> {
  const expectedDuration = expectedSceneDurationsSeconds.reduce(
    (sum, duration) => sum + duration,
    0,
  );

  // Multi-act stitching pipeline:
  // 1) normalize all clips to a compatible format
  // 2) stitch through Remotion composition for smooth transitions
  // 3) validate duration and only fallback when required
  const normalizedPaths: string[] = [];
  for (let index = 0; index < inputPaths.length; index += 1) {
    const normalizedPath = outputPath.replace(
      ".mp4",
      `-normalized-${index + 1}.mp4`,
    );
    await normalizeClipForConcat(
      inputPaths[index]!,
      normalizedPath,
      expectedSceneDurationsSeconds[index] ?? MULTI_ACT_SCENE_SECONDS,
    );
    normalizedPaths.push(normalizedPath);
  }

  let stitchedDuration = 0;

  try {
    await stitchVideosWithRemotion({
      inputPaths: normalizedPaths,
      outputPath,
      expectedSceneDurationsSeconds,
    });
  } catch (remotionError) {
    logger.warn("multi_act_remotion_stitch_failed", {
      error:
        remotionError instanceof Error
          ? remotionError.message
          : String(remotionError),
    });
  }

  try {
    stitchedDuration = await probeVideoDurationSeconds(outputPath);
  } catch (probeError) {
    logger.warn("multi_act_probe_output_failed", {
      error:
        probeError instanceof Error ? probeError.message : String(probeError),
    });
  }
  // Accept up to a 30% shortfall from the scripted duration; below that we
  // retry with a filter_complex concat fallback. Scale with scene length so
  // the pipeline stays modular for 2–10 acts of any duration.
  const minimumExpectedDuration = Math.max(
    MULTI_ACT_SCENE_SECONDS,
    expectedDuration * 0.7,
  );

  if (stitchedDuration < minimumExpectedDuration) {
    logger.warn("multi_act_duration_too_short_retrying_ffmpeg_fallback", {
      expectedDurationSeconds: expectedDuration,
      stitchedDurationSeconds: stitchedDuration,
      minimumExpectedDuration,
      clipDurations: expectedSceneDurationsSeconds,
    });
    await runFilterConcatFallback({
      inputPaths: normalizedPaths,
      outputPath,
    });
    stitchedDuration = await probeVideoDurationSeconds(outputPath);
  }

  await Promise.all(
    normalizedPaths.map((normalizedPath) =>
      fs.unlink(normalizedPath).catch(() => {}),
    ),
  );

  if (stitchedDuration < minimumExpectedDuration) {
    throw new Error(
      `Stitched output too short (${stitchedDuration.toFixed(2)}s, expected about ${expectedDuration.toFixed(2)}s).`,
    );
  }

  return stitchedDuration;
}

async function probeVideoDurationSeconds(filePath: string): Promise<number> {
  const { stderr } = await runCommandCapture(
    "ffmpeg",
    ["-i", filePath],
    path.dirname(filePath),
    true,
  );
  const match = stderr.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not determine video duration for ${filePath}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

async function probeHasAudioStream(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await runCommandCapture(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      path.dirname(filePath),
      true,
    );
    return stdout.toLowerCase().includes("audio");
  } catch {
    return false;
  }
}

async function normalizeClipForConcat(
  inputPath: string,
  outputPath: string,
  targetDurationSeconds: number,
): Promise<void> {
  const clampedTargetSeconds = Math.max(
    env.VIDEO_MIN_DURATION_SECONDS,
    Math.min(env.VIDEO_MAX_DURATION_SECONDS, targetDurationSeconds),
  );
  const inputDurationSeconds = await probeVideoDurationSeconds(inputPath).catch(
    () => clampedTargetSeconds,
  );
  const hasAudioStream = await probeHasAudioStream(inputPath).catch(() => false);
  const safeInputDurationSeconds = Math.max(0.25, inputDurationSeconds);
  const retimeFactor = clampedTargetSeconds / safeInputDurationSeconds;
  if (hasAudioStream) {
    await runCommand(
      "ffmpeg",
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=24,setpts=${retimeFactor.toFixed(6)}*PTS`,
        "-t",
        String(clampedTargetSeconds),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0",
        "-af",
        `aresample=48000,apad=pad_dur=${clampedTargetSeconds},atrim=0:${clampedTargetSeconds}`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      path.dirname(outputPath),
    );
    return;
  }

  // No audio stream: copy video directly (avoids expensive re-encode of high-bitrate
  // sources like Wan 2.6 at ~15 Mbps which OOM-kills ffmpeg on constrained workers).
  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      "-f",
      "lavfi",
      "-t",
      String(clampedTargetSeconds),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-t",
      String(clampedTargetSeconds),
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    path.dirname(outputPath),
  );
}

async function stitchVideosWithRemotion(input: {
  inputPaths: string[];
  outputPath: string;
  expectedSceneDurationsSeconds: number[];
}): Promise<void> {
  const configPath = input.outputPath.replace(".mp4", "-remotion-config.json");
  const config = {
    inputPaths: input.inputPaths,
    outputPath: input.outputPath,
    fps: MULTI_ACT_STITCH_FPS,
    width: 1280,
    height: 720,
    transitionFrames: MULTI_ACT_TRANSITION_FRAMES,
    expectedSceneDurationsSeconds: input.expectedSceneDurationsSeconds,
    defaultSceneDurationSeconds: MULTI_ACT_SCENE_SECONDS,
  };

  await fs.writeFile(configPath, JSON.stringify(config), "utf8");

  const remotionEnv: NodeJS.ProcessEnv = { ...process.env };
  const localChromiumLibDir = path.join(
    process.cwd(),
    ".tmp",
    "chrome-libs",
    "usr",
    "lib",
    "x86_64-linux-gnu",
  );
  try {
    await fs.access(path.join(localChromiumLibDir, "libnss3.so"));
    remotionEnv.LD_LIBRARY_PATH = remotionEnv.LD_LIBRARY_PATH
      ? `${localChromiumLibDir}:${remotionEnv.LD_LIBRARY_PATH}`
      : localChromiumLibDir;
  } catch {
    // Ignore: production images may already provide these shared libs system-wide.
  }

  try {
    await runCommand(
      "node",
      ["scripts/remotion-stitch.mjs", configPath],
      process.cwd(),
      remotionEnv,
    );
  } finally {
    await fs.unlink(configPath).catch(() => {});
  }
}

async function runFilterConcatFallback(input: {
  inputPaths: string[];
  outputPath: string;
}): Promise<void> {
  const args: string[] = ["-y"];
  for (const inputPath of input.inputPaths) {
    args.push("-i", inputPath);
  }

  const filterGraph =
    input.inputPaths.map((_, index) => `[${index}:v:0][${index}:a:0]`).join("") +
    `concat=n=${input.inputPaths.length}:v=1:a=1[v_raw][a]` +
    `;[v_raw]scale=${FALLBACK_STITCH_WIDTH}:${FALLBACK_STITCH_HEIGHT}:force_original_aspect_ratio=decrease,pad=${FALLBACK_STITCH_WIDTH}:${FALLBACK_STITCH_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${MULTI_ACT_STITCH_FPS}[v]`;

  args.push(
    "-filter_complex",
    filterGraph,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-threads",
    String(FALLBACK_STITCH_THREADS),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    input.outputPath,
  );

  try {
    await runCommand("ffmpeg", args, path.dirname(input.outputPath));
  } catch (errorWithAudio) {
    logger.warn("multi_act_filter_concat_with_audio_failed_retrying_video_only", {
      error:
        errorWithAudio instanceof Error
          ? errorWithAudio.message
          : String(errorWithAudio),
    });

    const fallbackArgs: string[] = ["-y"];
    for (const inputPath of input.inputPaths) {
      fallbackArgs.push("-i", inputPath);
    }

    const videoOnlyGraph =
      input.inputPaths.map((_, index) => `[${index}:v:0]`).join("") +
      `concat=n=${input.inputPaths.length}:v=1:a=0[v_raw]` +
      `;[v_raw]scale=${FALLBACK_STITCH_WIDTH}:${FALLBACK_STITCH_HEIGHT}:force_original_aspect_ratio=decrease,pad=${FALLBACK_STITCH_WIDTH}:${FALLBACK_STITCH_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${MULTI_ACT_STITCH_FPS}[v]`;

    fallbackArgs.push(
      "-filter_complex",
      videoOnlyGraph,
      "-map",
      "[v]",
      "-threads",
      String(FALLBACK_STITCH_THREADS),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      input.outputPath,
    );

    await runCommand("ffmpeg", fallbackArgs, path.dirname(input.outputPath));
  }
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  await runCommandCapture(command, args, cwd, false, env);
}

const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

async function runCommandCapture(
  command: string,
  args: string[],
  cwd: string,
  allowNonZeroExit: boolean,
  env?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`));
    }, FFMPEG_TIMEOUT_MS);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(killTimer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(killTimer);
      if (code === 0 || allowNonZeroExit) {
        resolve({ stdout, stderr });
        return;
      }

      const reason = signal ? `signal ${signal}` : `code ${code}`;
      reject(
        new Error(`${command} failed with ${reason}: ${stderr || "no stderr"}`),
      );
    });
  });
}
