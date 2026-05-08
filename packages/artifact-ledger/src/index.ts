import { readGitHubPathPolicy, enforcePathPolicy, createPublishArtifact, createCodeEditPR, type GitHubTask } from "@hypermyths/github-agent";

export type ArtifactKind = "research_block" | "video_script" | "video_manifest" | "simulation_report" | "intelligence_report" | "ad_campaign" | "code_output" | "documentation" | "other";
export type ArtifactPublishStatus = "draft" | "published" | "pr_opened" | "failed" | "blocked";

export type ArtifactRecord = {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  sourceCommandId?: string;
  sourceThesisId?: string;
  sourceJobId?: string;
  sourceAgentId?: string;
  storageUrl?: string;
  githubTaskId?: string;
  githubPath?: string;
  githubSha?: string;
  publishStatus: ArtifactPublishStatus;
  visibility: "public" | "private" | "unlisted";
  createdAt: string;
  updatedAt: string;
};

export function createArtifactRecord(input: Omit<ArtifactRecord, "id" | "createdAt" | "updatedAt" | "publishStatus">): ArtifactRecord {
  return {
    ...input,
    id: crypto.randomUUID(),
    publishStatus: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createPublishableArtifact(input: { artifact: ArtifactRecord; repoOwner: string; repoName: string; basePath: string }): { artifact: ArtifactRecord; githubTask: GitHubTask; allowed: boolean; reason: string } {
  const policy = readGitHubPathPolicy();
  const path = `${input.basePath}/${input.artifact.id}.md`;
  const pathCheck = enforcePathPolicy({ path, mode: "artifact_publish", policy });
  if (!pathCheck.allowed) return { artifact: input.artifact, githubTask: createPublishArtifact({ repoOwner: input.repoOwner, repoName: input.repoName, path, content: "", commitMessage: "" }), allowed: false, reason: pathCheck.reason };

  const githubTask = createPublishArtifact({
    repoOwner: input.repoOwner,
    repoName: input.repoName,
    path,
    content: `# ${input.artifact.title}\n\n${input.artifact.content}\n\n_Generated artifact ${input.artifact.id}_`,
    commitMessage: `publish: ${input.artifact.title}`
  });

  return {
    artifact: { ...input.artifact, githubTaskId: githubTask.id, githubPath: path, publishStatus: "published" },
    githubTask,
    allowed: true,
    reason: "Published to artifact branch"
  };
}

export function createArtifactCodePR(input: { artifact: ArtifactRecord; repoOwner: string; repoName: string; basePath: string; prTitle: string }): { artifact: ArtifactRecord; githubTask: GitHubTask; allowed: boolean; reason: string } {
  const policy = readGitHubPathPolicy();
  const path = `${input.basePath}/${input.artifact.id}.ts`;
  const pathCheck = enforcePathPolicy({ path, mode: "code_edit", policy });
  if (!pathCheck.allowed) return { artifact: input.artifact, githubTask: createPublishArtifact({ repoOwner: input.repoOwner, repoName: input.repoName, path: "", content: "", commitMessage: "" }), allowed: false, reason: pathCheck.reason };

  const githubTask = createCodeEditPR({
    repoOwner: input.repoOwner,
    repoName: input.repoName,
    path,
    content: input.artifact.content,
    prTitle: input.prTitle,
    commitMessage: `code: ${input.artifact.title}`
  });

  return {
    artifact: { ...input.artifact, githubTaskId: githubTask.id, githubPath: path, publishStatus: "pr_opened" },
    githubTask,
    allowed: true,
    reason: "PR created for code edit"
  };
}

export function artifactPublishStatus(env: NodeJS.ProcessEnv = process.env) {
  const enabled = (env.ARTIFACT_PUBLISH_ENABLED ?? "true") === "true";
  const maxSizeMb = Number(env.ARTIFACT_MAX_GITHUB_SIZE_MB ?? 10);
  const githubOwner = env.GITHUB_DEFAULT_OWNER ?? "";
  const githubRepo = env.GITHUB_DEFAULT_REPO ?? "";
  return { enabled, githubConfigured: Boolean(githubOwner && githubRepo), maxSizeMb, directPaths: (env.ARTIFACT_DIRECT_PATHS ?? "").split(",").filter(Boolean) };
}
