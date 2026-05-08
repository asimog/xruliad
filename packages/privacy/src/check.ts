import { classifyInput, routeByPrivacy } from "./index";

const tier = classifyInput("prepare a market thesis without keys");
const decision = routeByPrivacy({ tier, runtimeMode: "web" });
if (!decision.allowed) throw new Error(decision.reason);
console.log("Privacy routing boundary ok.");
