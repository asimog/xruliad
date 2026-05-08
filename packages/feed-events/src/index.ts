import type { FeedItem, FeedEvent, FeedFilter } from "@hypermyths/unified-feed";

export type FeedRealtimeSubscription = {
  channel: string;
  filter: FeedFilter;
  active: boolean;
};

export type FeedEventEnvelope = {
  type: "feed_item_created" | "feed_item_updated" | "feed_event";
  payload: FeedItem | FeedEvent;
  timestamp: string;
};

export function createEventEnvelope(payload: FeedItem | FeedEvent, type: FeedEventEnvelope["type"]): FeedEventEnvelope {
  return { type, payload, timestamp: new Date().toISOString() };
}

export function subscribeToGlobalFeed(filter?: FeedFilter): FeedRealtimeSubscription {
  return { channel: "global-feed", filter: filter ?? {}, active: true };
}

export function subscribeToProductFeed(productId: string, filter?: FeedFilter): FeedRealtimeSubscription {
  return { channel: `product-feed:${productId}`, filter: { ...filter, productId: productId as FeedFilter["productId"] }, active: true };
}

export function subscribeToCommandFeed(commandId: string): FeedRealtimeSubscription {
  return { channel: `command-feed:${commandId}`, filter: {}, active: true };
}

export function subscribeToThesisFeed(thesisId: string): FeedRealtimeSubscription {
  return { channel: `thesis-feed:${thesisId}`, filter: {}, active: true };
}

export function unsubscribeFeed(subscription: FeedRealtimeSubscription): void {
  subscription.active = false;
}

export function readRealtimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: (env.UNIFIED_FEED_REALTIME_ENABLED ?? "true") === "true",
    pollIntervalMs: Number(env.UNIFIED_FEED_POLL_INTERVAL_MS ?? 5000),
    mode: env.SUPABASE_URL ? "realtime" as const : "polling" as const
  };
}
