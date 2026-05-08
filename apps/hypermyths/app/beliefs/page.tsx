import { TerminalRoutePage } from "../terminal-route-page";

export default function BeliefsPage() {
  return (
    <TerminalRoutePage
      title="Beliefs"
      summary="RBM-inspired Belief Engine: every thesis tracks visible learning frames as evidence, inference, payments, and simulations shift confidence over time. Not ML — practical progress tracking."
      badges={["Web available", "Hybrid available", "Platform payment", "RBM Belief"]}
      items={[
        "Create beliefs from commands/theses",
        "Add supporting/counter evidence",
        "Track confidence shifts over time",
        "Route inference through cheapest safe provider",
        "Quote and execute pay.sh payments",
        "View belief timeline and frames",
        "Attach artifacts (reports, videos, ads)",
        "Export local trade intents (no web execution)"
      ]}
    />
  );
}
