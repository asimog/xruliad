import { normalizeFeedItem, productToFeedJobTypes } from "@hypermyths/unified-feed";

export default function HashMythFeedPage() {
  const types = productToFeedJobTypes.hashmyth ?? [];
  const items = types.map((t) => normalizeFeedItem({ source_product: "hashmyth", job_type: t, title: `HashMyth ${t} feed item`, status: "complete", runtime_mode: "web", privacy_tier: "public" }));

  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px", color: "#e9efff", background: "#0a0a1a" }}>
      <h1>HashMyth Feed</h1>
      <p>Video generation feed. Part of the HyperMyths Unified Feed.</p>
      <pre style={{ overflow: "auto", padding: 20, borderRadius: 8, border: "1px solid rgba(167,139,250,.24)", background: "rgba(10,10,26,.72)" }}>
        {JSON.stringify({ product: "hashmyth", jobTypes: types, items }, null, 2)}
      </pre>
    </main>
  );
}
