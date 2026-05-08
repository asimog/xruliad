import { TerminalRoutePage } from "../terminal-route-page";

export default function GitHubPage() {
  return (
    <TerminalRoutePage
      title="GitHub Agent"
      summary="GitHub App integration for safe agent-editable code and artifact publishing. Source changes go through PRs; generated artifacts publish directly to allowed paths."
      badges={["Web available", "Requires approval", "GitHub App"]}
      items={[
        "Connected repos + installation tokens",
        "Artifact publish mode (direct to allowed paths)",
        "Code edit mode (branch → PR → human approval)",
        "Path allowlist enforcement",
        "Protected paths: .env, secrets, keys",
        "Branch prefix: agent/",
        "Commit + PR tracking",
        "Artifact provenance ledger"
      ]}
    />
  );
}
