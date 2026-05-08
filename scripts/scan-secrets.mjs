import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exit } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const IGNORED_DIRS = new Set(["node_modules", ".git", ".turbo", ".next", "dist", "build", "coverage", "__pycache__", ".vercel", ".railway"]);
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db"]);

const SECRET_PATTERNS = [
  { name: "OpenRouter API Key", regex: /sk-or-v1-[a-zA-Z0-9]{20,}/g },
  { name: "OpenAI API Key", regex: /sk-[a-zA-Z0-9]{20,}/g },
  { name: "Private Key (hex)", regex: /\b[0-9a-fA-F]{64}\b/g },
  { name: "Private Key (base58)", regex: /\b[1-9A-HJ-NP-Za-km-z]{44,88}\b/g },
  { name: "Supabase Service Role Key", regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: "JWT / Bearer Token", regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: "AWS Access Key", regex: /(?:AKIA|ASIA)[A-Z0-9]{16}/g },
];

const found = [];

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    if (IGNORED_FILES.has(entry)) continue;
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        scanDir(full);
      } else if (st.isFile() && !entry.endsWith(".pem") && !entry.endsWith(".key") && !entry.endsWith(".lock")) {
        try {
          const content = readFileSync(full, "utf-8");
          for (const pattern of SECRET_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches) {
              for (const m of matches) {
                found.push({ file: full.replace(ROOT, ""), match: m, pattern: pattern.name });
              }
            }
          }
        } catch {
          // binary file, skip
        }
      }
    } catch {
      // permission error, skip
    }
  }
}

scanDir(ROOT);

if (found.length > 0) {
  console.log(`\n[WARNING] Found ${found.length} potential secrets:\n`);
  for (const f of found) {
    const truncated = f.file.length > 60 ? "..." + f.file.slice(-57) : f.file;
    const redacted = f.match.slice(0, 10) + "..." + (f.match.length > 6 ? f.match.slice(-4) : "");
    console.log(`  ${truncated}: ${f.pattern} → ${redacted}`);
  }
  console.log(`\n[SECRETS:SCAN] Found ${found.length} potential secrets. Review manually.`);
  exit(1);
} else {
  console.log("[SECRETS:SCAN] No secrets found.");
  exit(0);
}
