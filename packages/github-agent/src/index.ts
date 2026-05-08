export type GitHubMode = "artifact_publish" | "code_edit" | "disabled";
export type GitHubTaskStatus = "queued" | "branch_created" | "committed" | "pr_opened" | "pr_merged" | "published" | "failed" | "blocked";
export type GitHubBranchType = "artifact" | "code" | "release";

export type GitHubRepo = {
  owner: string;
  repo: string;
  installationId?: string;
  allowedModes: GitHubMode[];
  artifactBranch: string;
  codeBranchPrefix: string;
};

export type GitHubTask = {
  id: string;
  repoOwner: string;
  repoName: string;
  mode: GitHubMode;
  branch?: string;
  branchType: GitHubBranchType;
  path: string;
  content?: string;
  commitMessage?: string;
  prTitle?: string;
  prUrl?: string;
  commitSha?: string;
  status: GitHubTaskStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type GitHubPathPolicy = {
  allowedArtifactPaths: string[];
  protectedPaths: string[];
  allowDirectArtifactPublish: boolean;
  allowCodeDirectPush: boolean;
  maxFileSizeMb: number;
};

const DEFAULT_PROTECTED_PATHS = [".env*", "secrets/**", "private/**", "keys/**", ".github/workflows/**"];
const DEFAULT_ARTIFACT_PATHS = ["results/**", "public/generated/**", "generated/**", "reports/**", "blocks/**", "artifacts/**", "docs/generated/**"];

export function readGitHubStatus(env: NodeJS.ProcessEnv = process.env) {
  const appId = env.GITHUB_APP_ID;
  const installationId = env.GITHUB_APP_INSTALLATION_ID;
  const token = env.GITHUB_TOKEN;
  const configured = Boolean(appId || token);
  const authenticated = Boolean((appId && env.GITHUB_APP_PRIVATE_KEY && installationId) || token);
  return { configured, authenticated, appMode: Boolean(appId), tokenFallback: Boolean(!appId && token) };
}

export function readGitHubPathPolicy(env: NodeJS.ProcessEnv = process.env): GitHubPathPolicy {
  return {
    allowedArtifactPaths: (env.GITHUB_ALLOWED_ARTIFACT_PATHS ?? env.ARTIFACT_DIRECT_PATHS)?.split(",").map((p) => p.trim()) ?? DEFAULT_ARTIFACT_PATHS,
    protectedPaths: (env.GITHUB_PROTECTED_PATHS)?.split(",").map((p) => p.trim()) ?? DEFAULT_PROTECTED_PATHS,
    allowDirectArtifactPublish: (env.GITHUB_ALLOW_DIRECT_ARTIFACT_PUBLISH ?? "true") === "true",
    allowCodeDirectPush: (env.GITHUB_ALLOW_CODE_DIRECT_PUSH ?? "false") === "true",
    maxFileSizeMb: Number(env.ARTIFACT_MAX_GITHUB_SIZE_MB ?? 10)
  };
}

export function enforcePathPolicy(input: { path: string; mode: GitHubMode; policy: GitHubPathPolicy }): { allowed: boolean; reason: string } {
  const isProtected = input.policy.protectedPaths.some((pattern) => {
    const regex = new RegExp("^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
    return regex.test(input.path);
  });
  if (isProtected) return { allowed: false, reason: `Path ${input.path} is protected` };

  if (input.mode === "artifact_publish") {
    if (!input.policy.allowDirectArtifactPublish) return { allowed: false, reason: "Direct artifact publish disabled" };
    const inAllowlist = input.policy.allowedArtifactPaths.some((pattern) => {
      const regex = new RegExp("^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
      return regex.test(input.path);
    });
    if (!inAllowlist) return { allowed: false, reason: `Path ${input.path} not in artifact allowlist` };
    return { allowed: true, reason: "Artifact path allowed" };
  }

  if (input.mode === "code_edit") {
    if (input.policy.allowCodeDirectPush) return { allowed: true, reason: "Code direct push allowed" };
    return { allowed: true, reason: "Code edit requires PR" };
  }

  return { allowed: false, reason: "Disabled mode" };
}

export function createGitHubTask(input: Omit<GitHubTask, "id" | "createdAt" | "updatedAt" | "status">): GitHubTask {
  return { ...input, id: crypto.randomUUID(), status: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function createPublishArtifact(input: { repoOwner: string; repoName: string; path: string; content: string; commitMessage: string; branch?: string; installationId?: string }): GitHubTask {
  return createGitHubTask({
    repoOwner: input.repoOwner,
    repoName: input.repoName,
    mode: "artifact_publish",
    branch: input.branch ?? "main",
    branchType: "artifact",
    path: input.path,
    content: input.content,
    commitMessage: input.commitMessage
  });
}

export function createCodeEditPR(input: { repoOwner: string; repoName: string; path: string; content: string; prTitle: string; commitMessage: string; branchPrefix?: string }): GitHubTask {
  const prefix = input.branchPrefix ?? "agent/";
  const branch = `${prefix}${crypto.randomUUID().slice(0, 8)}`;
  return createGitHubTask({
    repoOwner: input.repoOwner,
    repoName: input.repoName,
    mode: "code_edit",
    branch,
    branchType: "code",
    path: input.path,
    content: input.content,
    commitMessage: input.commitMessage,
    prTitle: input.prTitle
  });
}
