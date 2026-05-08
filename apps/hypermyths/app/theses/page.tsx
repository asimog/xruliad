import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Theses" summary="Create, run, view, and contribute to theses. Trade intents export locally only." badges={["Web available", "Hybrid available", "Requires approval"]} items={["Market thesis", "Prediction thesis", "RWA thesis", "Research thesis", "Simulation request", "Export local intent"]} />;
}
