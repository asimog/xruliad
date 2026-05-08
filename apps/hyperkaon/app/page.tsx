import { AppShell, Badge, Card, HeroSection, OrbitalCTA, SectionFrame } from "@hypermyths/ui";

const sections = [
  ["Simulation Quests", "Define physics scenarios that can become benchmarkable synthetic data tasks."],
  ["Physics Engine", "Connect external simulation engines without claiming results before jobs run."],
  ["Synthetic Physics Data", "Package generated observations, constraints, and validation notes."],
  ["Compute Market", "Route expensive compute work through explicit jobs, costs, and result records."]
];

export default function Page() {
  return (
    <AppShell productId="hyperkaon" showNav>
      <HeroSection
        productId="hyperkaon"
        title="HyperKaon"
        action={<OrbitalCTA href="/quests">Open simulation quests</OrbitalCTA>}
      >
        HyperKaon is a physics simulation and compute quest engine for generating, testing, and rewarding synthetic physical-world data.
      </HeroSection>
      <SectionFrame className="hyperkaon-grid">
        {sections.map(([title, copy]) => (
          <Card key={title}>
            <Badge>Module</Badge>
            <h2>{title}</h2>
            <p>{copy}</p>
          </Card>
        ))}
      </SectionFrame>
    </AppShell>
  );
}
