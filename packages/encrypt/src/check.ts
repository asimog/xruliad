import { encryptPayloadLocalFallback, readEncryptStatus } from "./index";
console.log(JSON.stringify({ status: readEncryptStatus(), payload: encryptPayloadLocalFallback("check") }, null, 2));
