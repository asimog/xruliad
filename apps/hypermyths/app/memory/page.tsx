import { TerminalRoutePage } from "../terminal-route-page";

export default function MemoryPage() {
  return (
    <TerminalRoutePage
      title="Agent Memory"
      summary="Structured agent memory: Supabase Postgres with local/cloud routing, pgvector semantic search, and sync controls."
      badges={["Web available", "Local only", "Hybrid available", "Requires approval"]}
      items={[
        "Agent memories (local/cloud split)",
        "Memory chunks + vector embeddings",
        "Command memory records",
        "Thesis memory records",
        "Run + receipt memory",
        "Memory sync queue (approval-gated)",
        "Redaction + encryption before cloud sync",
        "No wallet/key material in cloud"
      ]}
    />
  );
}
