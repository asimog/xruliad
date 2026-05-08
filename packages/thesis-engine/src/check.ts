import { createThesis, exportLocalTradeIntent } from "./index";
const thesis = createThesis({ productId: "polymyths", type: "market", title: "check", claim: "check", visibility: "public" });
const intent = exportLocalTradeIntent(thesis);
if (intent.mode !== "web_prepare_only") throw new Error("Thesis export must prepare only by default.");
console.log(JSON.stringify({ thesis, intent }, null, 2));
