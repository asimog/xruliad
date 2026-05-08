import type { ProductId } from "@hypermyths/theme";
export type AnalyticsEvent = { productId: ProductId; name: string; properties?: Record<string, unknown>; createdAt: string };
export function createEvent(productId: ProductId, name: string, properties?: Record<string, unknown>): AnalyticsEvent {
  return { productId, name, properties, createdAt: new Date().toISOString() };
}
