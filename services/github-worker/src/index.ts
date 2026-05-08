import { readGitHubStatus, readGitHubPathPolicy, enforcePathPolicy } from "@hypermyths/github-agent";
import { selectSupabaseClient } from "@hypermyths/supabase";

const status = readGitHubStatus();
const policy = readGitHubPathPolicy();
const db = selectSupabaseClient(process.env, false, true);

const testPath = enforcePathPolicy({ path: "results/test.md", mode: "artifact_publish", policy });

console.log(JSON.stringify({
  service: "github-worker",
  status,
  policy: { allowedArtifactPaths: policy.allowedArtifactPaths.length, protectedPaths: policy.protectedPaths },
  pathTest: { allowed: testPath.allowed, reason: testPath.reason },
  supabase: { configured: Boolean(db.url), mode: db.mode }
}, null, 2));
