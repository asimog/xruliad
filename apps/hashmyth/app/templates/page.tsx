import { AppShell, Card, SectionFrame } from "@hypermyths/ui";

type Template = { name: string; source: string; description: string; endpoint: string; payload: Record<string, unknown> };

const templates: Template[] = [
  {
    name: "Token Hype Video",
    source: "token",
    description: "Generate a video for a Solana memecoin token.",
    endpoint: "/api/video/from-token",
    payload: { tokenAddress: "6p6xgHyF7Km6mNx...", network: "solana" }
  },
  {
    name: "Whale Wallet Story",
    source: "wallet",
    description: "Tell a story about a wallet's on-chain activity.",
    endpoint: "/api/video/from-wallet",
    payload: { walletAddress: "7EcDhSYGxXysc...", network: "solana" }
  },
  {
    name: "X Profile Recap",
    source: "x_profile",
    description: "Summarize a Twitter/X profile as a video.",
    endpoint: "/api/video/from-x-profile",
    payload: { handle: "solana_dev" }
  },
  {
    name: "Market Thesis Explainer",
    source: "market_thesis",
    description: "Visualize a Polymyths market thesis.",
    endpoint: "/api/video/from-market-thesis",
    payload: { thesisId: "thesis-001", thesisTitle: "SOL to $500 by Q4" }
  },
  {
    name: "Research Discovery Video",
    source: "research_report",
    description: "Transform cancer research findings into video.",
    endpoint: "/api/video/from-research-report",
    payload: { questId: "cancer-001", reportTitle: "Novel Biomarker Discovery" }
  },
  {
    name: "Physics Simulation Replay",
    source: "simulation",
    description: "Visualize a HyperKaon physics simulation.",
    endpoint: "/api/video/from-simulation",
    payload: { simulationId: "phys-001", simulationTitle: "Energy Density Simulation" }
  },
  {
    name: "Ad Campaign Creative",
    source: "ad_campaign",
    description: "Create video ad from Hypertian campaign.",
    endpoint: "/api/video/from-ad-campaign",
    payload: { campaignId: "ad-001", campaignName: "DeFi Summer 2026" }
  },
  {
    name: "Custom Script Video",
    source: "script",
    description: "Generate video from a custom narrative script.",
    endpoint: "/api/video/script",
    payload: { title: "My Custom Video", script: "A journey through the Solana ecosystem..." }
  }
];

export default function TemplatesPage() {
  return (
    <AppShell productId="hashmyth" showNav>
      <SectionFrame style={{ paddingTop: "96px" }}>
        <h1>Video Templates</h1>
        <p style={{ color: "rgba(233,239,255,0.7)", marginBottom: "2rem" }}>
          Ready-to-use templates for common video generation scenarios. POST to the endpoint with the payload to create a video job.
        </p>
        <div className="hashmyth-grid">
          {templates.map((t) => (
            <Card key={t.name}>
              <h3 style={{ margin: "0 0 0.25rem", color: "#a78bfa" }}>{t.name}</h3>
              <p style={{ margin: "0 0 0.5rem", color: "rgba(233,239,255,0.7)", fontSize: "0.85rem" }}>{t.description}</p>
              <code style={{ fontSize: "0.7rem", color: "rgba(233,239,255,0.5)" }}>POST {t.endpoint}</code>
              <pre style={{
                marginTop: "0.5rem",
                fontSize: "0.65rem",
                background: "rgba(0,0,0,0.3)",
                padding: "0.5rem",
                borderRadius: 4,
                overflow: "auto",
                color: "rgba(167,139,250,0.8)"
              }}>
                {JSON.stringify(t.payload, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      </SectionFrame>
    </AppShell>
  );
}
