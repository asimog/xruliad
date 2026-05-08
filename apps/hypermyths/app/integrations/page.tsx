import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Integrations" summary="QVAC, pay.sh, x402, OpenRouter, Dexter, Encrypt, Ika, Supabase, Railway, and Vercel status." badges={["Web available", "Hybrid available", "Requires QVAC"]} items={["QVAC optional", "pay.sh platform", "user-local pay.sh", "x402 discovery", "Encrypt boundary", "Ika policy"]} />;
}
