import { TerminalRoutePage } from "../terminal-route-page";
import { readFeedConfig } from "@hypermyths/unified-feed";

export default function FeedPage() {
  const config = readFeedConfig();
  return (
    <TerminalRoutePage
      title="Unified Feed"
      summary="One feed across every product: intelligence, predictions, videos, ads, research, simulations, code, payments, and local execution intents. Web jobs are transparent. Local jobs are privacy-preserving."
      badges={["Web available", "Hybrid available", "Platform payment"]}
      items={[
        "Global ecosystem feed (all products)",
        "Command, thesis, and contribution jobs",
        "Video & ad jobs with sponsor transparency",
        "Research, simulation, and intelligence reports",
        "Platform pay.sh payment receipts",
        "Local execution intents (commitment-only)",
        "Encrypted actor identities for local jobs",
        "Realtime updates (polling fallback)"
      ]}
    />
  );
}
