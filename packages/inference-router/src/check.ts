import { routeInference } from "./index";
const route = routeInference({ taskClass: "thesis_run", privacyTier: "public" });
if (route.provider === "blocked") throw new Error(route.reason);
console.log(JSON.stringify(route, null, 2));
