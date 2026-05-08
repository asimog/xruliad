import { config as loadEnv } from "dotenv";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

async function main() {
  const jobId = process.argv[2]?.trim();
  const outputDir = process.argv[3]?.trim() || "/tmp/hypermyths-artifacts";

  if (!jobId) {
    throw new Error(
      "Usage: npx tsx scripts/save-job-artifacts.ts <jobId> [outputDir]",
    );
  }

  const repoModule = await import("@/lib/jobs/repository");
  const repo =
    (repoModule as unknown as { default?: typeof repoModule }).default ??
    repoModule;
  const pdfModule = await import("@/lib/pdf/report");
  const storageModule = await import("@/lib/storage/s3");
  const { generateReportPdf } = pdfModule;
  const { extractS3KeyFromUrl, generateSignedVideoUrl } = storageModule;

  const artifacts = await repo.getJobArtifacts(jobId);
  if (!artifacts.job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  await mkdir(outputDir, { recursive: true });

  const baseName = `${artifacts.job.subjectName ?? artifacts.job.jobId}`
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || jobId;

  const jsonPath = path.join(outputDir, `${baseName}-${jobId}.json`);
  await writeFile(jsonPath, JSON.stringify(artifacts, null, 2), "utf8");

  let pdfPath: string | null = null;
  if (artifacts.report) {
    pdfPath = path.join(outputDir, `${baseName}-${jobId}.pdf`);
    const pdf = await generateReportPdf(artifacts.report);
    await writeFile(pdfPath, pdf);
  }

  let videoPath: string | null = null;
  if (artifacts.video?.videoUrl) {
    const key = extractS3KeyFromUrl(artifacts.video.videoUrl);
    const sourceUrl =
      (key ? await generateSignedVideoUrl(key, 3600) : null) ??
      artifacts.video.videoUrl;
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download video (status ${response.status}) from ${sourceUrl}`,
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    videoPath = path.join(outputDir, `${baseName}-${jobId}.mp4`);
    await writeFile(videoPath, bytes);
  }

  console.log(
    JSON.stringify({
      jobId,
      outputDir,
      jsonPath,
      pdfPath,
      videoPath,
    }),
  );
}

void main().catch((error) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
