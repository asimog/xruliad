import { quotePlatformAction, readPlatformPayShStatus } from "./index";
console.log(JSON.stringify({ status: readPlatformPayShStatus(), quote: quotePlatformAction({ productId: "hypermyths", action: "video_generation", estimatedCostUsd: 0 }) }, null, 2));
