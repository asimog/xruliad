export type AuditEventType = "command" | "thesis" | "payment" | "inference" | "display" | "execution" | "privacy";
export type AuditRecord = {
  id: string;
  type: AuditEventType;
  actor: "platform" | "user" | "agent" | "local_gateway";
  action: string;
  status: "prepared" | "approved" | "rejected" | "executed" | "blocked" | "failed" | "complete";
  details?: Record<string, unknown>;
  createdAt: string;
};

const records: AuditRecord[] = [];

export function createAuditRecord(input: Omit<AuditRecord, "id" | "createdAt">): AuditRecord {
  const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  records.push(record);
  return record;
}

export function getAuditRecords() {
  return [...records];
}
