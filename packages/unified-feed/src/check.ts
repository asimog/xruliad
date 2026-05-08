import { readFeedConfig, normalizeFeedItem, filterFeedItems, productToFeedJobTypes } from "./index.js";
const config = readFeedConfig();
const webItem = normalizeFeedItem({ source_product: "polymyths", job_type: "thesis", title: "Market thesis created", status: "complete", runtime_mode: "web", privacy_tier: "public", actor_id: "user-1", payment_plane: "platform", cost_usd: 0 });
const localItem = normalizeFeedItem({ source_product: "hypermyths", job_type: "local_trade_intent", title: "Buy signal thesis", status: "prepared", runtime_mode: "local", privacy_tier: "private_strategy", actor_id: "user-2", local_only: true });
const filtered = filterFeedItems([webItem, localItem], { productId: "hypermyths" });
console.log(JSON.stringify({ config, webItem, localItem, filtered: filtered.length, productMap: productToFeedJobTypes }, null, 2));
