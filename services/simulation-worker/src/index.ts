import { readMiroSharkConfig } from "@hypermyths/simulation";
const config = readMiroSharkConfig();
if (!config.baseUrl) throw new Error("Simulation worker requires MIROSHARK_BASE_URL.");
console.log("Simulation worker boundary ready.");
