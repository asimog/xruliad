import { normalizeFeedItem } from "@hypermyths/unified-feed";
import { runtimeStatus } from "@hypermyths/runtime";

const runtime = runtimeStatus();

const webFeedItems = [
  normalizeFeedItem({ source_product: "hypermyths", job_type: "command", title: "Feed check command", status: "complete", runtime_mode: "web", privacy_tier: "public" }),
  normalizeFeedItem({ source_product: "polymyths", job_type: "thesis", title: "Feed check thesis", status: "prepared", runtime_mode: "web", privacy_tier: "public" }),
  normalizeFeedItem({ source_product: "hypermyths", job_type: "local_trade_intent", title: "Private trade signal", status: "prepared", runtime_mode: "local", privacy_tier: "private_strategy", local_only: true })
];

console.log(JSON.stringify({ service: "terminal-api", runtime, feedItems: webFeedItems, total: webFeedItems.length }, null, 2));
