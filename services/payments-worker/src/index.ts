import { readPlatformPayShStatus, readUserLocalPaymentStatus } from "@hypermyths/paysh";
console.log(JSON.stringify({ service: "payments-worker", platform: readPlatformPayShStatus(), userLocal: readUserLocalPaymentStatus() }, null, 2));
