import { encryptPayloadLocalFallback } from "@hypermyths/encrypt";
import { createIkaSigningIntent } from "@hypermyths/ika";
import { routeInference } from "@hypermyths/inference-router";
import { createExecutionIntent } from "@hypermyths/local-trading";
import { quotePlatformAction } from "@hypermyths/platform-payments";
import { readQvacStatus } from "@hypermyths/qvac";
import { sealStrategyRecord } from "@hypermyths/strategy-vault";
import { createThesis } from "@hypermyths/thesis-engine";
import { prepareAdCampaign } from "@hypermyths/ads";
import { prepareHashMythVideo } from "@hypermyths/hashmyth-video";
import { runtimeStatus } from "@hypermyths/runtime";

export default function DemoPage() {
  const runtime = runtimeStatus();
  const qvac = readQvacStatus();
  const route = routeInference({ taskClass: "thesis_run", privacyTier: "public" });
  const quote = quotePlatformAction({ productId: "hypermyths", action: "premium_intelligence", estimatedCostUsd: 0 });
  const thesis = createThesis({ productId: "polymyths", type: "market", title: "Hackathon Market Thesis", claim: "Public thesis can run on the cheapest safe route; private strategy remains local.", visibility: "public" });
  const sealed = sealStrategyRecord({ plaintext: thesis.claim, publicSummary: thesis.title });
  const video = prepareHashMythVideo({ title: thesis.title, sourcePrompt: thesis.claim, source: "market_thesis" });
  const ad = prepareAdCampaign({ thesisId: thesis.id, title: "Transparent thesis ad", sponsor: "HyperMyths demo", concept: "Sponsor metadata remains visible." });
  const tradeIntent = createExecutionIntent({ thesisId: thesis.id, venue: "paper", asset: thesis.title, side: "simulate", rationale: "Prepared only; local execution gateway required." });
  const encrypt = encryptPayloadLocalFallback(thesis.claim);
  const ika = createIkaSigningIntent({ thesisId: thesis.id, intentId: tradeIntent.id });

  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px", color: "#effffb", background: "#050807" }}>
      <section style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 44, letterSpacing: 0 }}>Hackathon Demo</h1>
        <p style={{ color: "#b8d7d0" }}>Create a market thesis, route public inference safely, use QVAC if available, quote pay.sh, seal the thesis, prepare video/ad artifacts, and export a local-only trade intent.</p>
        <pre style={{ overflow: "auto", padding: 20, borderRadius: 8, border: "1px solid rgba(124,228,210,.24)", background: "rgba(4,16,14,.72)" }}>
          {JSON.stringify({ runtime, qvac, route, quote, thesis, sealed, video, ad, encrypt, ika, tradeIntent, liveExecutionFromWeb: false }, null, 2)}
        </pre>
      </section>
    </main>
  );
}
