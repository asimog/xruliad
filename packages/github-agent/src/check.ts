import { readGitHubStatus, readGitHubPathPolicy, enforcePathPolicy, type GitHubTask } from "./index.js";
const status = readGitHubStatus();
const policy = readGitHubPathPolicy();
const testTask: GitHubTask = { id: "test", repoOwner: "owner", repoName: "repo", mode: "artifact_publish", branchType: "artifact", path: "results/test.md", status: "queued", createdAt: "", updatedAt: "" };
const pathCheck = enforcePathPolicy({ path: testTask.path, mode: testTask.mode, policy });
console.log(JSON.stringify({ status, policy, pathCheck }, null, 2));
