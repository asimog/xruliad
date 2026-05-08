import { productCapabilities } from "./index";
const caps = productCapabilities("hypermyths");
if (caps.safeExecutionMode !== "web_prepare_only") throw new Error("Product API must default to web_prepare_only.");
console.log(JSON.stringify(caps, null, 2));
