import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "packages/runtime/src/index.ts",
  "packages/qvac/src/index.ts",
  "services/qvac-gateway/src/index.ts",
  "packages/local-trading/src/index.ts",
  "services/local-execution-gateway/src/index.ts",
  "packages/platform-payments/src/index.ts",
  "packages/user-local-payments/src/index.ts",
  "packages/paysh/src/index.ts",
  "packages/x402-discovery/src/index.ts",
  "packages/encrypt/src/index.ts",
  "packages/ika/src/index.ts",
  "packages/command-protocol/src/index.ts",
  "packages/thesis-engine/src/index.ts",
  "packages/agent-memory/src/index.ts",
  "packages/vector-memory/src/index.ts",
  "packages/github-agent/src/index.ts",
  "packages/artifact-ledger/src/index.ts",
  "packages/memory-sync/src/index.ts",
  "packages/feed-privacy/src/index.ts",
  "packages/unified-feed/src/index.ts",
  "packages/feed-events/src/index.ts",
  "packages/belief-engine/src/index.ts",
  "packages/openrouter/src/index.ts",
  "packages/byok/src/index.ts",
  "services/github-worker/src/index.ts",
  "apps/hypermyths/app/demo/page.tsx",
  "apps/hypermyths/app/demo/rbm-belief/page.tsx",
  "apps/hypermyths/app/feed/page.tsx",
  "apps/hypermyths/app/memory/page.tsx",
  "apps/hypermyths/app/github/page.tsx",
  "demo/hackathon/final-demo.json"
];

const missing = required.filter((file) => !existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing hackathon-critical files:\n${missing.join("\n")}`);
  process.exit(1);
}

const runtime = readFileSync(path.join(root, "packages/runtime/src/index.ts"), "utf8");
if (!runtime.includes('return "web_prepare_only"')) {
  console.error("Runtime must default execution mode to web_prepare_only.");
  process.exit(1);
}

const risk = readFileSync(path.join(root, "packages/risk/src/index.ts"), "utf8");
if (!risk.includes("requireUserApproval")) {
  console.error("Risk policy must enforce user approval.");
  process.exit(1);
}

const supabase = readFileSync(path.join(root, "packages/supabase/src/index.ts"), "utf8");
if (!supabase.includes("assertNoServiceRoleInBrowser")) {
  console.error("Supabase package must guard against service role key in browser.");
  process.exit(1);
}

const agentMemory = readFileSync(path.join(root, "packages/agent-memory/src/index.ts"), "utf8");
if (!agentMemory.includes("blocked") || !agentMemory.includes("chooseMemoryStore")) {
  console.error("Agent memory must include memory routing with blocked detection.");
  process.exit(1);
}

const github = readFileSync(path.join(root, "packages/github-agent/src/index.ts"), "utf8");
if (!github.includes("enforcePathPolicy")) {
  console.error("GitHub agent must enforce path policy.");
  process.exit(1);
}

const feedPrivacy = readFileSync(path.join(root, "packages/feed-privacy/src/index.ts"), "utf8");
if (!feedPrivacy.includes("assertFeedSafe") || !feedPrivacy.includes("createLocalJobEnvelope")) {
  console.error("Feed privacy must include assertFeedSafe and createLocalJobEnvelope.");
  process.exit(1);
}

const unifiedFeed = readFileSync(path.join(root, "packages/unified-feed/src/index.ts"), "utf8");
if (!unifiedFeed.includes("normalizeFeedItem")) {
  console.error("Unified feed must include normalizeFeedItem.");
  process.exit(1);
}

const beliefEngine = readFileSync(path.join(root, "packages/belief-engine/src/index.ts"), "utf8");
if (!beliefEngine.includes("computeConfidence") || !beliefEngine.includes("createBelief")) {
  console.error("Belief engine must include computeConfidence and createBelief.");
  process.exit(1);
}

const openrouter = readFileSync(path.join(root, "packages/openrouter/src/index.ts"), "utf8");
if (!openrouter.includes("testOpenRouterKey") || !openrouter.includes("redactOpenRouterKey")) {
  console.error("OpenRouter package must include testOpenRouterKey and redactOpenRouterKey.");
  process.exit(1);
}

console.log("Hackathon-critical boundary check passed.");
