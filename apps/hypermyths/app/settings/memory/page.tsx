import { TerminalRoutePage } from "../../terminal-route-page";

export default function MemorySettingsPage() {
  return (
    <TerminalRoutePage
      title="Memory Settings"
      summary="Configure local/cloud/hybrid memory mode, sync behavior, redaction policy, GitHub repos, and artifact publishing."
      badges={["Requires approval", "Local only", "Web available"]}
      items={[
        "Memory mode: hybrid (default)",
        "Local Supabase: MythVault private storage",
        "Cloud Supabase: web-safe shared memory",
        "Sync policy: auto-sync public, approve private",
        "Redaction: enable for sensitive data",
        "GitHub repos: configure default owner/repo",
        "Artifact publishing: allowed paths + max size",
        "Block key material: always on"
      ]}
    />
  );
}
