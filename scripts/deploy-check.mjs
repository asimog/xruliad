import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const checks = [];

function check(label, condition, detail) {
  const pass = Boolean(condition);
  checks.push({ label, pass, detail });
  console.log(`${pass ? "  PASS" : "  FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
}

console.log("\n=== deploy:check ===\n");

// Required directories
check("apps/hypermyths exists", existsSync(path.join(root, "apps", "hypermyths")));
check("apps/hashmyth exists", existsSync(path.join(root, "apps", "hashmyth")));
check("services/hermes-worker exists", existsSync(path.join(root, "services", "hermes-worker")));
check("packages/admin exists", existsSync(path.join(root, "packages", "admin")));
check("packages/supabase exists", existsSync(path.join(root, "packages", "supabase")));

// No service role in browser
const envEx = path.join(root, ".env.example");
if (existsSync(envEx)) {
  const content = readFileSync(envEx, "utf8");
  check("No NEXT_PUBLIC service role key in .env.example",
    !content.includes("NEXT_PUBLIC_SUPABASE_SERVICE") && !content.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"));
}

// Gitignore blocks secrets
const gitignore = path.join(root, ".gitignore");
if (existsSync(gitignore)) {
  const content = readFileSync(gitignore, "utf8");
  check(".gitignore blocks .env files", content.includes(".env"));
  check(".gitignore blocks key files", content.includes("*.pem") || content.includes("*.key"));
}

// Package.json scripts exist
const pkg = require(path.join(root, "package.json"));
const scripts = Object.keys(pkg.scripts || {});
["build", "lint", "typecheck", "test"].forEach((s) => {
  check(`Script "${s}" exists`, scripts.includes(s));
});

// Required app package.jsons exist
const apps = ["hypermyths", "hashmyth", "polymyths", "cancerhawk", "hyperkaon", "hypertian"];
apps.forEach((app) => {
  check(`apps/${app}/package.json exists`, existsSync(path.join(root, "apps", app, "package.json")));
});

// Supabase migrations
const migrationsDir = path.join(root, "supabase", "migrations");
if (existsSync(migrationsDir)) {
  const migrationFiles = readdirSyncSafe(migrationsDir).filter((f) => f.endsWith(".sql"));
  check("Supabase migrations exist", migrationFiles.length > 0, `${migrationFiles.length} files`);
}

function readdirSyncSafe(dir) {
  try { return existsSync(dir) ? readdirSync(dir) : []; } catch { return []; }
}
import { readdirSync } from "node:fs";

const failures = checks.filter((c) => !c.pass);
console.log(`\n=== Result: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} passed) ===\n`);

if (failures.length > 0) {
  console.log("Failures:");
  failures.forEach((f) => console.log(`  - ${f.label}`));
  process.exit(1);
} else {
  console.log("Deploy readiness check passed.\n");
  process.exit(0);
}
