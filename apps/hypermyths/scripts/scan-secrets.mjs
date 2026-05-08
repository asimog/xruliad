import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SECRET_PATTERNS = [
  {
    name: "Privy app secret",
    regex: /privy_app_secret_[A-Za-z0-9]{16,}/g,
  },
  {
    name: "Privy wallet auth key",
    regex: /wallet-auth:[A-Za-z0-9+/]{16,}/g,
  },
  {
    name: "Legacy Privy wallet API key",
    regex: /wallet-api:[A-Za-z0-9+/]{16,}/g,
  },
];

const SKIP_PREFIXES = [
  "docs/",
  "node_modules/",
  ".next/",
  "coverage/",
  "dist/",
];

function isSkippable(path) {
  return SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isSkippable(line));
}

function main() {
  const failures = [];

  for (const file of getTrackedFiles()) {
    const absolute = resolve(process.cwd(), file);
    let content = "";

    try {
      content = readFileSync(absolute, "utf8");
    } catch {
      continue;
    }

    for (const pattern of SECRET_PATTERNS) {
      const matches = content.match(pattern.regex);
      if (matches?.length) {
        failures.push({
          file,
          name: pattern.name,
          sample: matches[0],
        });
      }
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `[secrets] ${failure.name} detected in ${failure.file}: ${failure.sample}`,
      );
    }
    process.exit(1);
  }

  console.log("Secret scan passed.");
}

main();
