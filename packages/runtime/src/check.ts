import { assertNoWebLiveTrading, runtimeStatus } from "./index";

assertNoWebLiveTrading();
console.log(JSON.stringify(runtimeStatus(), null, 2));
