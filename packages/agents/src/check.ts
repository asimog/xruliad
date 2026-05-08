import { getMotoSetupStatus, agentWorkflows } from "./index";

const status = getMotoSetupStatus();
console.log(`Agent workflows registered: ${agentWorkflows.length}`);
if (!status.installed) {
  console.log("Moto/fstack boundary exists, but MOTO_BASE_PATH is not set. Install or clone https://github.com/buildingopen/moto and set MOTO_BASE_PATH.");
} else {
  console.log(`Moto/fstack configured at ${status.basePath}.`);
}
