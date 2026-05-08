import { checkExecutionRisk } from "./index";
const result = checkExecutionRisk({ venue: "paper", asset: "TEST" });
if (result.allowed) throw new Error("Default web_prepare_only policy should block execution.");
console.log("Risk policy boundary ok.");
