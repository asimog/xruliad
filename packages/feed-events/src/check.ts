import { readRealtimeConfig, subscribeToGlobalFeed, createEventEnvelope } from "./index.js";
import { normalizeFeedItem } from "@hypermyths/unified-feed";
const config = readRealtimeConfig();
const item = normalizeFeedItem({ source_product: "hypermyths", job_type: "command", title: "Test feed event", status: "running", runtime_mode: "web", privacy_tier: "public" });
const envelope = createEventEnvelope(item, "feed_item_created");
const sub = subscribeToGlobalFeed();
console.log(JSON.stringify({ config, envelope, subscription: sub }, null, 2));
