import { readOpenRouterConfig, testOpenRouterKey, chooseOpenRouterModel, redactOpenRouterKey, readSpendPolicy } from "./index.js";

const config = readOpenRouterConfig();
const test = testOpenRouterKey(config.configured ? process.env.OPENROUTER_API_KEY : undefined);
const model = chooseOpenRouterModel(config);
const policy = readSpendPolicy();

console.log(JSON.stringify({
  configured: config.configured,
  test: { valid: test.valid, message: test.message },
  model,
  policy,
  keyPreview: config.configured ? redactOpenRouterKey(process.env.OPENROUTER_API_KEY!) : "[not set]"
}, null, 2));
