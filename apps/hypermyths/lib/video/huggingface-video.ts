/**
 * HuggingFace Inference Providers video generation client.
 *
 * Model:    Wan-AI/Wan2.1-T2V-14B (configurable via HF_VIDEO_MODEL)
 * Provider: fal-ai (configurable via HF_VIDEO_INFERENCE_PROVIDER)
 * Auth:     HF access token (HUGGINGFACE_API_KEY)
 *
 * The HuggingFace Inference Providers API routes the request through
 * the HF token billing system to the underlying provider (fal-ai here).
 * The response is raw binary video data (Blob) which we upload to S3.
 */

import { InferenceClient } from "@huggingface/inference";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { uploadVideoBufferToStorage } from "@/lib/storage/s3";

export async function generateHuggingFaceVideo(input: {
  jobId: string;
  prompt: string;
  durationSeconds: number;
  subjectName?: string | null;
  sourceTranscript?: string | null;
}): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const env = getEnv();

  const apiKey = env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured.");
  }

  const model = env.HF_VIDEO_MODEL;
  const provider = env.HF_VIDEO_INFERENCE_PROVIDER as "fal-ai";

  const minDuration = env.VIDEO_MIN_DURATION_SECONDS;
  const maxDuration = env.VIDEO_MAX_DURATION_SECONDS;
  const clampedDuration = Math.max(minDuration, Math.min(maxDuration, input.durationSeconds));

  logger.info("hf_video_start", {
    component: "huggingface_video",
    jobId: input.jobId,
    model,
    provider,
    durationSeconds: clampedDuration,
    promptPreview: input.prompt.slice(0, 120),
  });

  const client = new InferenceClient(apiKey);

  // textToVideo() handles async polling internally and returns the video as a Blob.
  // For large models like Wan2.1-T2V-14B via fal-ai, generation can take several minutes.
  const blob = await client.textToVideo({
    model,
    inputs: input.prompt,
    provider,
  });

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  logger.info("hf_video_received", {
    component: "huggingface_video",
    jobId: input.jobId,
    sizeBytes: buffer.length,
  });

  const s3Key = `video-renders/${input.jobId}/final.mp4`;
  const s3Url = await uploadVideoBufferToStorage(buffer, s3Key, "video/mp4");

  if (!s3Url) {
    throw new Error(
      "HuggingFace video generated but S3 is not configured — cannot store the result.",
    );
  }

  logger.info("hf_video_complete", {
    component: "huggingface_video",
    jobId: input.jobId,
    s3Url: s3Url.slice(0, 100),
  });

  return { videoUrl: s3Url, thumbnailUrl: null };
}
