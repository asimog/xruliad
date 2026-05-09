import { readGitHubStatus, readGitHubPathPolicy, enforcePathPolicy } from "@hypermyths/github-agent";
import { selectSupabaseClient } from "@hypermyths/supabase";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function workerStatus() {
  const status = readGitHubStatus();
  const policy = readGitHubPathPolicy();
  const db = selectSupabaseClient(process.env, false, true);
  const testPath = enforcePathPolicy({ path: "results/test.md", mode: "artifact_publish", policy });

  return {
    status,
    policy: { allowedArtifactPaths: policy.allowedArtifactPaths.length, protectedPaths: policy.protectedPaths },
    pathTest: { allowed: testPath.allowed, reason: testPath.reason },
    supabase: { configured: Boolean(db.url), mode: db.mode }
  };
}

startServiceRuntime({
  service: "github-worker",
  role: "GitHub artifact, PR, and path-policy worker.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "GET /github/status", "POST /github/path-policy/check"],
  capabilities: workerStatus,
  routes: {
    "GET /github/status": workerStatus,
    "POST /github/path-policy/check": ({ body }) => {
      const policy = readGitHubPathPolicy();
      const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
      return enforcePathPolicy({
        path: String(input.path ?? "results/test.md"),
        mode: (input.mode as never) ?? "artifact_publish",
        policy
      });
    }
  }
});
