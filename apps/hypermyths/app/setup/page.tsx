import { TerminalRoutePage } from "../terminal-route-page";

export default function SetupPage() {
  return (
    <TerminalRoutePage
      title="Setup"
      summary="Configure the minimum needed to run the HyperMyths system. OpenRouter API key + pay.sh wallet are the essentials. QVAC/local services are optional."
      badges={["Web available", "Hybrid available", "Requires approval"]}
      items={[
        "OpenRouter API key (BYOK — browser encrypted by default)",
        "pay.sh wallet/config (platform + user-local planes)",
        "Test your OpenRouter key",
        "Test your pay.sh config",
        "Optional: Connect local QVAC",
        "Optional: Connect local Supabase (MythVault)",
        "Optional: Connect local trading gateway",
        "Start first command or thesis"
      ]}
    />
  );
}
