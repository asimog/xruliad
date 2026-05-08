import { localExecutionGatewayStatus } from "@hypermyths/execution";
import { localTradingCapabilities } from "@hypermyths/local-trading";

const status = { health: localExecutionGatewayStatus(false), capabilities: localTradingCapabilities() };
if (process.argv.includes("--check")) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("Local execution gateway boundary ready on localhost only.");
  console.log(JSON.stringify(status, null, 2));
}
