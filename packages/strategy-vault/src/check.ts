import { sealStrategyRecord, vaultStatus } from "./index";
sealStrategyRecord({ plaintext: "demo private thesis", publicSummary: "demo" });
console.log(JSON.stringify(vaultStatus(), null, 2));
