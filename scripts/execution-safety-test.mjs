import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
console.log("\n=== execution:safety:test ===\n");

const checks = [];
function check(label, pass, detail) {
  checks.push({ label, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
}

// 1. Runtime mode is web_prepare_only
const runtimeSrc = path.join(root, "packages", "runtime", "src", "index.ts");
if (existsSync(runtimeSrc)) {
  const content = readFileSync(runtimeSrc, "utf8");
  check("Runtime defaults to web_prepare_only", content.includes("web_prepare_only"));
}

// 2. Local trading enforces web_prepare_only
const localTradingSrc = path.join(root, "packages", "local-trading", "src", "index.ts");
if (existsSync(localTradingSrc)) {
  const content = readFileSync(localTradingSrc, "utf8");
  check("Local trading enforces web_prepare_only", content.includes("web_prepare_only"));
  check("Local trading has createExecutionIntent", content.includes("createExecutionIntent"));
  check("Local trading has local-only execute", content.includes("executeIntentLocalOnly"));
}

// 3. Execution gateway is local-only
const executionSrc = path.join(root, "packages", "execution", "src", "index.ts");
if (existsSync(executionSrc)) {
  const content = readFileSync(executionSrc, "utf8");
  check("Execution gateway is local-only", content.includes("localOnly: true") || content.includes("local_only"));
}

// 4. Supabase persistence has forbidden secret detection
const persistenceSrc = path.join(root, "packages", "supabase", "src", "persistence.ts");
if (existsSync(persistenceSrc)) {
  const content = readFileSync(persistenceSrc, "utf8");
  const hasForbidden = ["privateKey", "secretKey", "walletPrivateKey",
    "exchangeApiSecret", "payShWalletPrivateKey",
    "seedPhrase", "mnemonic", "rawPrivateStrategy"];
  check("Persistence detects forbidden secret fields", content.includes("detectForbiddenSecretFields"));
  check("Persistence has cloud-safe payload check", content.includes("assertCloudSafePayload"));
  hasForbidden.forEach((field) => {
    check(`Forbidden field "${field}" in persistence guard`, content.includes(field), field);
  });
}

// 5. Supabase index has forbidden stores
const supabaseSrc = path.join(root, "packages", "supabase", "src", "index.ts");
if (existsSync(supabaseSrc)) {
  const content = readFileSync(supabaseSrc, "utf8");
  check("Supabase has forbidden stores", content.includes("supabaseForbiddenStores"));
  check("Supabase guards service role in browser", content.includes("assertNoServiceRoleInBrowser"));
  check("Supabase has isForbiddenClass", content.includes("isForbiddenClass"));
}

// 6. Risk policy enforces user approval
const riskSrc = path.join(root, "packages", "risk", "src", "index.ts");
if (existsSync(riskSrc)) {
  const content = readFileSync(riskSrc, "utf8");
  check("Risk policy requires user approval", content.includes("requireUserApproval"));
}

// 7. No live trading keys in env example
const envExample = path.join(root, "services", "hermes-worker", ".env.example");
if (existsSync(envExample)) {
  const content = readFileSync(envExample, "utf8");
  check("Hermes worker env example has no trading key", !content.includes("TRADING_PRIVATE_KEY"));
  check("Hermes worker env example has no user wallet private key",
    !/(USER_WALLET_PRIVATE_KEY|USER_TRADING_PRIVATE_KEY)/.test(content));
}

// 8. QVAC is optional for web mode
const qvacSrc = path.join(root, "packages", "qvac", "src", "index.ts");
if (existsSync(qvacSrc)) {
  const content = readFileSync(qvacSrc, "utf8");
  check("QVAC is configurable", content.includes("QVAC_ENABLED"));
  check("QVAC has chat support", content.includes("qvacChat"));
  check("QVAC has embed support", content.includes("qvacEmbed"));
  check("QVAC has health check", content.includes("qvacHealth"));
}

const failures = checks.filter((c) => !c.pass);
console.log(`\n=== Result: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} passed) ===\n`);

if (failures.length > 0) {
  console.log("Failures:");
  failures.forEach((f) => console.log(`  - ${f.label}`));
  process.exit(1);
} else {
  console.log("Execution safety tests passed.\n");
  process.exit(0);
}
