import { artifactPublishStatus, createArtifactRecord, createPublishableArtifact } from "./index.js";
const artifact = createArtifactRecord({ kind: "intelligence_report", title: "Test Report", content: "Test content", visibility: "public" });
const result = createPublishableArtifact({ artifact, repoOwner: "owner", repoName: "repo", basePath: "reports" });
console.log(JSON.stringify({ status: artifactPublishStatus(), artifact, result: { allowed: result.allowed, reason: result.reason } }, null, 2));
