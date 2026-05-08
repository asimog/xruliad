import { createAuditRecord } from "@hypermyths/audit";
import { approveExecutionIntent, executeIntentLocalOnly, simulateExecutionIntent, type ExecutionIntent } from "@hypermyths/local-trading";

export type LocalExecutionGatewayStatus = {
  healthy: boolean;
  localOnly: true;
  paired: boolean;
  originAllowlist: string[];
  endpoints: string[];
};

export function localExecutionGatewayStatus(paired = false): LocalExecutionGatewayStatus {
  return {
    healthy: true,
    localOnly: true,
    paired,
    originAllowlist: ["http://localhost:3000", "http://127.0.0.1:3000"],
    endpoints: ["GET /health", "GET /capabilities", "GET /policies", "POST /intent/import", "POST /intent/simulate", "POST /intent/approve", "POST /intent/reject", "POST /intent/execute", "GET /intents/:id", "GET /audit"]
  };
}

export function requirePairingToken(token?: string) {
  if (!token || token.length < 16) throw new Error("Local execution gateway requires a pairing token.");
}

export function simulateIntent(intent: ExecutionIntent) {
  createAuditRecord({ type: "execution", actor: "local_gateway", action: "simulate", status: "prepared", details: { intentId: intent.id } });
  return simulateExecutionIntent(intent);
}

export function approveIntent(intent: ExecutionIntent, approved: boolean) {
  createAuditRecord({ type: "execution", actor: "user", action: approved ? "approve" : "reject", status: approved ? "approved" : "rejected", details: { intentId: intent.id } });
  return approved ? approveExecutionIntent(intent) : { ...intent, status: "rejected" as const };
}

export function executeApprovedIntent(intent: ExecutionIntent) {
  const result = executeIntentLocalOnly(intent);
  createAuditRecord({ type: "execution", actor: "local_gateway", action: "execute", status: result.status === "executed" ? "executed" : "blocked", details: { intentId: intent.id } });
  return result;
}
