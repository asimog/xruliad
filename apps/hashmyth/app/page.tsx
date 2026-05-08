import { AppShell, Badge, Card, HeroSection, OrbitalCTA, SectionFrame } from "@hypermyths/ui";

const sections = [
  ["Token Video", "Generate video from a Solana or EVM token contract address."],
  ["Wallet Video", "Turn wallet activity and intelligence into a video narrative."],
  ["X Profile Video", "Convert a Twitter/X profile into a video summary."],
  ["Market Thesis Video", "Visualize a Polymyths market thesis as a video."],
  ["Research Video", "Transform CancerHawk/HyperKaon research into video."],
  ["Ad Campaign Video", "Create video from Hypertian ad campaign concepts."]
];

export default function Page() {
  return (
    <AppShell productId="hashmyth" showNav>
      <HeroSection
        productId="hashmyth"
        title="HashMyth"
        action={<OrbitalCTA href="/create">Create Video</OrbitalCTA>}
      >
        Generate video from tokens, wallets, X profiles, market theses, research reports, simulations, and ads.
      </HeroSection>
      <SectionFrame className="hashmyth-grid">
        {sections.map(([title, copy]) => (
          <Card key={title}>
            <Badge>Source</Badge>
            <h2>{title}</h2>
            <p>{copy}</p>
          </Card>
        ))}
      </SectionFrame>
    </AppShell>
  );
}
