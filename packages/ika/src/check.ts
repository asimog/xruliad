import { createIkaSigningIntent, readIkaStatus } from "./index";
console.log(JSON.stringify({ status: readIkaStatus(), intent: createIkaSigningIntent({ check: true }) }, null, 2));
