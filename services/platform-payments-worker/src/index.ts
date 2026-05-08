import { readPlatformPayShStatus } from "@hypermyths/platform-payments";
console.log(JSON.stringify({ worker: "platform-payments", status: readPlatformPayShStatus() }, null, 2));
