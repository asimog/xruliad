import { routeInference } from "@hypermyths/inference-router";
console.log(JSON.stringify({ service: "inference-router", route: routeInference({ taskClass: "public_summary", privacyTier: "public" }) }, null, 2));
