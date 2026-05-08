#!/usr/bin/env node
/**
 * One-off: stitch the 3 scene videos for a failed three-act job.
 * Usage: node scripts/stitch-job-scenes.mjs <jobId>
 *
 * Requires: ffmpeg in PATH, S3 env vars, DATABASE_URL
 */
import "dotenv/config";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const jobId = process.argv[2];
if (!jobId) {
  console.error("Usage: node scripts/stitch-job-scenes.mjs <jobId>");
  process.exit(1);
}

const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET || "videos";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const DATABASE_URL = process.env.DATABASE_URL;

if (!S3_PUBLIC_URL || !S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("Missing S3 env vars");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const SCENE_COUNT = 3;
const SCENE_DURATION = 8;
const FPS = 24;

function sceneUrl(n) {
  return `${S3_PUBLIC_URL}/video-renders/${jobId}-scene-${n}/final.mp4`;
}

async function getSignedUrl(key) {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return getSignedUrl(client, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn: 3600 });
}

async function downloadVideo(url, outputPath) {
  // Resolve S3 public URLs to signed URLs for private buckets
  const s3KeyMatch = url.match(/video-renders\/.+?\.mp4/);
  let resolvedUrl = url;
  if (s3KeyMatch) {
    console.log(`  Generating signed URL for ${s3KeyMatch[0]}...`);
    resolvedUrl = await getSignedUrl(s3KeyMatch[0]);
  }
  console.log(`  Downloading...`);
  const res = await fetch(resolvedUrl);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = await res.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buf));
  const stat = await fs.stat(outputPath);
  console.log(`  → ${outputPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`${command} exited ${code}: ${stderr.slice(-300)}`));
    });
  });
}

function runCommandAllowFailure(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject);
    child.on("close", () => resolve({ stdout, stderr }));
  });
}

async function normalizeClip(inputPath, outputPath, durationSec) {
  console.log(`  Normalizing ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
  const inputDuration = await probeDuration(inputPath);
  const hasAudio = await probeHasAudio(inputPath);
  const safeInputDuration = Math.max(0.25, inputDuration);
  const retimeFactor = durationSec / safeInputDuration;

  if (hasAudio) {
    await runCommand("ffmpeg", [
      "-y", "-i", inputPath,
      "-vf", `scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=${FPS},setpts=${retimeFactor.toFixed(6)}*PTS`,
      "-t", String(durationSec),
      "-map", "0:v:0", "-map", "0:a:0",
      "-af", `aresample=48000,apad=pad_dur=${durationSec},atrim=0:${durationSec}`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "48000", "-ac", "2",
      "-movflags", "+faststart",
      outputPath,
    ], path.dirname(outputPath));
    return;
  }

  await runCommand("ffmpeg", [
    "-y", "-i", inputPath,
    "-f", "lavfi", "-t", String(durationSec), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-vf", `scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=${FPS},setpts=${retimeFactor.toFixed(6)}*PTS`,
    "-t", String(durationSec),
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart",
    outputPath,
  ], path.dirname(outputPath));
}

async function probeDuration(inputPath) {
  const { stderr } = await runCommandAllowFailure("ffmpeg", ["-i", inputPath], path.dirname(inputPath));
  const match = stderr.match(/Duration:\\s+(\\d+):(\\d+):(\\d+(?:\\.\\d+)?)/);
  if (!match) return SCENE_DURATION;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

async function probeHasAudio(inputPath) {
  const { stdout } = await runCommandAllowFailure(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_type",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ],
    path.dirname(inputPath),
  );
  return stdout.toLowerCase().includes("audio");
}

async function concatClips(inputPaths, outputPath) {
  console.log("  Concatenating clips...");
  const args = ["-y"];
  for (const p of inputPaths) args.push("-i", p);
  const filter =
    inputPaths.map((_, i) => `[${i}:v:0][${i}:a:0]`).join("") +
    `concat=n=${inputPaths.length}:v=1:a=1[v][a]`;
  args.push(
    "-filter_complex", filter,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-movflags", "+faststart",
    outputPath,
  );
  await runCommand("ffmpeg", args, path.dirname(outputPath));
}

async function uploadToS3(localPath, key) {
  console.log(`  Uploading to s3://${S3_BUCKET}/${key}`);
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  const body = await fs.readFile(localPath);
  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: "video/mp4",
    ACL: "public-read",
  }));
  const publicUrl = `${S3_PUBLIC_URL}/${key}`;
  console.log(`  → ${publicUrl}`);
  return publicUrl;
}

async function updateDb(videoUrl) {
  console.log("  Updating database...");
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `UPDATE "Job" SET status='complete', progress='complete', "errorCode"=NULL, "errorMessage"=NULL, "updatedAt"=NOW() WHERE "jobId"=$1`,
      [jobId],
    );
    await client.query(
      `UPDATE "Video" SET "videoUrl"=$1, "renderStatus"='ready', "updatedAt"=NOW() WHERE "jobId"=$2`,
      [videoUrl, jobId],
    );
    console.log("  DB updated.");
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`\n=== Stitching scenes for job ${jobId} ===\n`);

  const tmpDir = path.join(os.tmpdir(), `stitch-${jobId}`);
  await fs.mkdir(tmpDir, { recursive: true });
  console.log(`Working dir: ${tmpDir}\n`);

  try {
    // 1. Download all 3 scenes
    console.log("Step 1: Download scene videos");
    const scenePaths = [];
    for (let n = 1; n <= SCENE_COUNT; n++) {
      const url = sceneUrl(n);
      const localPath = path.join(tmpDir, `scene-${n}.mp4`);
      await downloadVideo(url, localPath);
      scenePaths.push(localPath);
    }

    // 2. Normalize each clip
    console.log("\nStep 2: Normalize clips");
    const normalizedPaths = [];
    for (let i = 0; i < scenePaths.length; i++) {
      const normPath = path.join(tmpDir, `norm-${i + 1}.mp4`);
      await normalizeClip(scenePaths[i], normPath, SCENE_DURATION);
      normalizedPaths.push(normPath);
    }

    // 3. Concatenate
    console.log("\nStep 3: Concatenate");
    const outputPath = path.join(tmpDir, "combined.mp4");
    await concatClips(normalizedPaths, outputPath);
    const stat = await fs.stat(outputPath);
    console.log(`  Output: ${outputPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

    // 4. Upload to S3
    console.log("\nStep 4: Upload to S3");
    const s3Key = `video-renders/${jobId}/final.mp4`;
    const videoUrl = await uploadToS3(outputPath, s3Key);

    // 5. Update DB
    console.log("\nStep 5: Update database");
    await updateDb(videoUrl);

    console.log(`\n✅ Done! Video URL:\n${videoUrl}\n`);
    console.log(`Job page: https://www.hypermyths.com/job/${jobId}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("\n❌ Failed:", err.message);
  process.exit(1);
});
