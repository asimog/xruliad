import { AppShell, Badge, Card, HeroSection, OrbitalCTA, SectionFrame } from "@hypermyths/ui";

const sections = [
  ["Narrative Thesis Creation", "Turn a story, event, token, or market question into a structured thesis."],
  ["Scenario Dashboard", "Track possible outcomes, timelines, assumptions, and evidence quality."],
  ["Intelligence Signals", "Collect market, news, social, and simulation signals through shared integrations."],
  ["Market Hypotheses", "Frame predictions as testable claims without governance positioning."]
];

export default function Page() {
  return (
    <AppShell productId="polymyths" showNav>
      <HeroSection
        productId="polymyths"
        title="Polymyths"
        action={<OrbitalCTA href="/theses">Create a thesis</OrbitalCTA>}
      >
        Polymyths turns narratives into intelligence markets, predictions, and testable scenarios.
      </HeroSection>
      <SectionFrame className="polymyths-grid">
        {sections.map(([title, copy]) => (
          <Card key={title}>
            <Badge>Layer</Badge>
            <h2>{title}</h2>
            <p>{copy}</p>
          </Card>
        ))}
      </SectionFrame>
    </AppShell>
  );
}
