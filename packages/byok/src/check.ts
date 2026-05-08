import { readByokConfig, validateKeyForStorage, redactKeyForDisplay, storageModeLabel } from "./index.js";

const config = readByokConfig();
const testValid = validateKeyForStorage("browser_local", "sk-or-v1-test-key-1234567890abcdef");
const testInvalid = validateKeyForStorage("browser_local", "bad");

console.log(JSON.stringify({
  config,
  testValid: { allowed: testValid.allowed, risk: testValid.risk },
  testInvalid: { allowed: testInvalid.allowed, note: testInvalid.note },
  redacted: redactKeyForDisplay("sk-or-v1-test-key-1234567890abcdef"),
  modeLabels: { browser_local: storageModeLabel("browser_local"), ephemeral: storageModeLabel("ephemeral_server"), cloud: storageModeLabel("encrypted_cloud") }
}, null, 2));
