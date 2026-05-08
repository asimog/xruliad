import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

type CreateOptions = {
  username: string;
  sceneCount: number;
  visibility: "public" | "private";
  processMode: "trigger" | "local";
};

function parseCreateOptions(argv: string[]): CreateOptions {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));

  const username = (positional[0] ?? "pmarca").replace(/^@/, "").trim();
  const sceneCount = Number.parseInt(positional[1] ?? "3", 10);

  if (!username) {
    throw new Error(
      "Usage: npx tsx scripts/local-profile-video.ts <username> <sceneCount> [--public] [--local-process]",
    );
  }

  if (!Number.isFinite(sceneCount) || sceneCount < 2 || sceneCount > 10) {
    throw new Error("sceneCount must be between 2 and 10.");
  }

  return {
    username,
    sceneCount,
    visibility: flags.has("--public") ? "public" : "private",
    processMode: flags.has("--local-process") ? "local" : "trigger",
  };
}

async function main() {
  const { createPromptVideoJob, getJob } = await import("@/lib/jobs/repository");
  const { triggerJobProcessing } = await import("@/lib/jobs/trigger");
  const { buildProfileDirection } = await import("@/lib/video/create-route-helpers");
  const command = (process.argv[2] ?? "create").trim().toLowerCase();

  if (command === "status") {
    const jobId = process.argv[3]?.trim();
    if (!jobId) {
      throw new Error("Usage: npx tsx scripts/local-profile-video.ts status <jobId>");
    }
    const job = await getJob(jobId);
    console.log(JSON.stringify(job, null, 2));
    return;
  }

  const options = parseCreateOptions(process.argv.slice(2));
  const pipeline =
    options.sceneCount === 2 ? "two_act_cinema" : "hypermyths_generic_engine";
  const experience =
    options.sceneCount === 2 ? "two_act_cinema" : "funcinema";

  const job = await createPromptVideoJob({
    requestKind: "mythx",
    packageType: "30s",
    subjectName: `@${options.username}`,
    subjectDescription: `${options.visibility === "public" ? "Public" : "Private"} ${options.sceneCount}-part profile cinema for @${options.username}.`,
    sourceMediaUrl: `https://x.com/${options.username}`,
    sourceMediaProvider: "x",
    requestedPrompt: buildProfileDirection({
      username: options.username,
      pipeline,
      notes:
        options.sceneCount === 2
          ? "Keep it sharp, biography-first, and end on a strong mythic reveal."
          : `Keep it biography-first, grounded in recent tweets, and structure the story across exactly ${options.sceneCount} scenes with a strong final reveal.`,
    }),
    audioEnabled: true,
    visibility: options.visibility,
    pricingMode: options.visibility,
    experience,
    creatorId: options.visibility === "private" ? "local-dev" : null,
    sceneCount: options.sceneCount,
    paymentWaived: true,
  });

  console.log(
    JSON.stringify({
      createdJobId: job.jobId,
      username: options.username,
      sceneCount: options.sceneCount,
      visibility: options.visibility,
      processMode: options.processMode,
      requestedPrompt: job.requestedPrompt,
      jobUrl: `${process.env.APP_BASE_URL ?? "https://hypermyths.com"}/job/${job.jobId}`,
    }),
  );

  if (options.processMode === "local") {
    const { processJob } = await import("@/workers/process-job");
    await processJob(job.jobId);
  } else {
    await triggerJobProcessing(job.jobId);
  }

  const fresh = await getJob(job.jobId);
  console.log(
    JSON.stringify({
      jobId: job.jobId,
      status: fresh?.status,
      progress: fresh?.progress,
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
