import { createCommand } from "@hypermyths/command-protocol";
console.log(JSON.stringify({ worker: "command", demo: createCommand({ productId: "hypermyths", type: "market_thesis", title: "demo", prompt: "demo", permission: "public" }) }, null, 2));
