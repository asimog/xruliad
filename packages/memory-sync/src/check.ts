import { memorySyncStatus } from "./index.js";
const status = memorySyncStatus();
console.log(JSON.stringify({ status }, null, 2));
