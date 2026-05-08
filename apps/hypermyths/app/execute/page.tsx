import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Execute" summary="Local execution gateway status and prepared execution intents. Web cannot live-execute." badges={["Local only", "Requires local gateway", "Requires approval"]} items={["Import intent", "Simulate", "Approve", "Reject", "Execute locally", "Audit"]} />;
}
