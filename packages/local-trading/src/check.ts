import { createExecutionIntent, executeIntentLocalOnly, localTradingCapabilities } from "./index";
const intent = createExecutionIntent({ venue: "paper", asset: "TEST", side: "simulate", rationale: "check" });
const result = executeIntentLocalOnly(intent);
if (result.status !== "blocked") throw new Error("Default intent must not execute from web_prepare_only mode.");
console.log(JSON.stringify(localTradingCapabilities(), null, 2));
