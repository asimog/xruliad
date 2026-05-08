import { TerminalRoutePage } from "../terminal-route-page";

export default function Page() {
  return <TerminalRoutePage title="Payments" summary="Transparent platform pay.sh receipts and local-only user payment status." badges={["Platform payment", "User-local payment", "Local only"]} items={["Platform quote", "Public receipt", "Video costs", "Ad costs", "Local spend policy", "No mixed wallets"]} />;
}
