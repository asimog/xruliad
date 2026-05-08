import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Trade" summary="Local-only trading overview. Web prepares intents and cannot execute live trades." badges={["Local only", "Requires local gateway", "Requires approval", "User-local payment"]} items={["Gateway status", "Prepared intents", "Paper/devnet default", "No cloud keys", "No Vercel execution", "Local audit"]} />;
}
