import { readPlatformPayShStatus, readUserLocalPaymentStatus } from "./index";
console.log(JSON.stringify({ platform: readPlatformPayShStatus(), userLocal: readUserLocalPaymentStatus() }, null, 2));
