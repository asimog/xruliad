import { createCommand, exportCommandLocalIntent } from "./index";
const command = createCommand({ productId: "hypermyths", type: "market_thesis", title: "check", prompt: "check", permission: "public" });
const intent = exportCommandLocalIntent(command);
if (intent.executableOnWeb) throw new Error("Commands must not export web-live trading.");
console.log(JSON.stringify({ command, intent }, null, 2));
