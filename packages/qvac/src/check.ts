import { readQvacStatus, qvacHealth } from "./index";
const status = readQvacStatus();
const health = await qvacHealth(status);
console.log(JSON.stringify({ ...status, health, capabilities: { chat: "available", embed: "available" } }, null, 2));
