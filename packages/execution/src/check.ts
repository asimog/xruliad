import { createExecutionIntent } from "@hypermyths/local-trading";
import { executeApprovedIntent, localExecutionGatewayStatus } from "./index";
const blocked = executeApprovedIntent(createExecutionIntent({ venue: "paper", asset: "TEST", side: "simulate", rationale: "safety" }));
if (blocked.status !== "blocked") throw new Error("Execution safety failed.");
console.log(JSON.stringify(localExecutionGatewayStatus(), null, 2));
