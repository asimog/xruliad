import { displayCapabilities } from "@hypermyths/display";
console.log(JSON.stringify({ worker: "display", capabilities: displayCapabilities() }, null, 2));
