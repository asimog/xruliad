import { readMiroSharkConfig } from "./index";

const config = readMiroSharkConfig();
const missing = [];
if (!config.baseUrl) missing.push("MIROSHARK_BASE_URL");
if (!config.apiKey) missing.push("MIROSHARK_API_KEY");
if (missing.length) {
  console.log(`MiroShark boundary exists, but live calls need: ${missing.join(", ")}.`);
  console.log("If running locally, start MiroShark with Neo4j/Docker and point MIROSHARK_BASE_URL at its API.");
} else {
  console.log(`MiroShark configured at ${config.baseUrl}.`);
}
