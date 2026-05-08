import { createVideoScript } from "@hypermyths/intelligence";
import type { ProductId, VideoScript } from "@hypermyths/types";

export type HashMythVideoJob = { id: string; source: "thesis" | "research" | "ad" | "wallet" | "token" | "terminal"; status: "prepared" | "queued" | "requires_payment" | "running" | "complete" | "failed"; script: VideoScript; createdAt: string };

export function prepareHashMythVideo(input: { productId?: ProductId; title: string; thesis: string; source: HashMythVideoJob["source"] }): HashMythVideoJob {
  return { id: crypto.randomUUID(), source: input.source, status: "prepared", script: createVideoScript({ productId: input.productId ?? "hypermyths", title: input.title, thesis: input.thesis }), createdAt: new Date().toISOString() };
}
