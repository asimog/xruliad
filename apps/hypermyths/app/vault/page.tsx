import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Vault" summary="Strategy vault status, sealed thesis payloads, Encrypt boundary, and local fallback." badges={["Local only", "Requires approval"]} items={["Sealed strategy", "Encrypted thesis", "Local fallback", "Encrypt devnet status", "No raw private strategy in Supabase", "Export receipts"]} />;
}
