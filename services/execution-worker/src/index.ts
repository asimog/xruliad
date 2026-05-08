import { localExecutionGatewayStatus } from "@hypermyths/execution";
console.log(JSON.stringify({ service: "execution-worker", note: "Local execution only; Railway/Vercel must not run live user trading.", status: localExecutionGatewayStatus(false) }, null, 2));
