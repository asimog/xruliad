import { normalizeFeedItem, productToFeedJobTypes } from "@hypermyths/unified-feed";

export default function CancerHawkFeedPage() {
  const types = productToFeedJobTypes.cancerhawk ?? [];
  const items = types.map((t) => normalizeFeedItem({ source_product: "cancerhawk", job_type: t, title: `CancerHawk ${t} feed item`, status: "complete", runtime_mode: "web", privacy_tier: "public" }));

  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px", color: "#effffb", background: "#050807" }}>
      <h1>CancerHawk Feed</h1>
      <p>Cancer research and synthetic data quest feed. Part of the HyperMyths Unified Feed.</p>
      <pre style={{ overflow: "auto", padding: 20, borderRadius: 8, border: "1px solid rgba(124,228,210,.24)", background: "rgba(4,16,14,.72)" }}>
        {JSON.stringify({ product: "cancerhawk", jobTypes: types, items }, null, 2)}
      </pre>
    </main>
  );
}
