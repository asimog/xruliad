import { AppShell, Card, SectionFrame } from "@hypermyths/ui";
import { HASHMYTH_VIDEO_SOURCES } from "@hypermyths/hashmyth-video";

const sourceLabels: Record<string, string> = {
  token: "From Token Address",
  wallet: "From Wallet Address",
  x_profile: "From X Profile",
  market_thesis: "From Market Thesis",
  research_report: "From Research Report",
  simulation: "From Simulation",
  ad_campaign: "From Ad Campaign",
  script: "From Script",
  prompt: "From Prompt",
  document: "From Document Upload",
  terminal_chat: "From Terminal Chat",
  feed_item: "From Feed Item",
  belief_timeline: "From Belief Timeline"
};

const sourceEndpoints: Record<string, string> = {
  token: "/api/video/from-token",
  wallet: "/api/video/from-wallet",
  x_profile: "/api/video/from-x-profile",
  market_thesis: "/api/video/from-market-thesis",
  research_report: "/api/video/from-research-report",
  simulation: "/api/video/from-simulation",
  ad_campaign: "/api/video/from-ad-campaign",
  script: "/api/video/script",
  prompt: "/api/video/generate",
  document: "/api/video/generate",
  terminal_chat: "/api/video/generate",
  feed_item: "/api/video/generate",
  belief_timeline: "/api/video/generate"
};

export default function CreatePage() {
  return (
    <AppShell productId="hashmyth" showNav>
      <SectionFrame style={{ paddingTop: "96px" }}>
        <h1>Create Video</h1>
        <p style={{ color: "rgba(233,239,255,0.7)", marginBottom: "2rem" }}>
          Choose a source to generate a video from. Each source accepts specific inputs via API or UI.
        </p>
        <div className="hashmyth-source-grid">
          {HASHMYTH_VIDEO_SOURCES.map((source) => (
            <Card key={source}>
              <h3 style={{ margin: "0 0 0.5rem", color: "#a78bfa" }}>
                {sourceLabels[source] ?? source}
              </h3>
              <p style={{ margin: "0 0 0.5rem", color: "rgba(233,239,255,0.6)", fontSize: "0.85rem" }}>
                POST {sourceEndpoints[source] ?? "/api/video/generate"}
              </p>
              <pre style={{
                fontSize: "0.7rem",
                background: "rgba(0,0,0,0.3)",
                padding: "0.5rem",
                borderRadius: 4,
                overflow: "auto",
                color: "rgba(167,139,250,0.8)"
              }}>
                {JSON.stringify({ source }, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      </SectionFrame>
    </AppShell>
  );
}
