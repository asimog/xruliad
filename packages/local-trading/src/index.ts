import type { ExecutionMode } from "@hypermyths/runtime";
import { checkExecutionRisk } from "@hypermyths/risk";

export type ExecutionIntent = {
  id: string;
  thesisId?: string;
  commandId?: string;
  venue: "paper" | "devnet" | "polymarket" | "exchange" | "wallet";
  asset: string;
  side: "buy" | "sell" | "hold" | "simulate";
  quantity?: number;
  notional?: number;
  mode: ExecutionMode;
  status: "prepared" | "simulated" | "approved" | "rejected" | "executed" | "blocked";
  rationale: string;
  createdAt: string;
};

export type LocalTradingCapabilities = {
  defaultMode: ExecutionMode;
  adapters: string[];
  requiresPairingToken: boolean;
  requiresUserApproval: boolean;
  secretsLocation: "local_only";
};

export function createExecutionIntent(input: Omit<ExecutionIntent, "id" | "createdAt" | "status" | "mode"> & { mode?: ExecutionMode }): ExecutionIntent {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "prepared",
    mode: input.mode ?? "web_prepare_only"
  };
}

export function simulateExecutionIntent(intent: ExecutionIntent): ExecutionIntent {
  return { ...intent, status: "simulated" };
}

export function approveExecutionIntent(intent: ExecutionIntent): ExecutionIntent {
  return { ...intent, status: "approved" };
}

export function executeIntentLocalOnly(intent: ExecutionIntent): ExecutionIntent {
  const risk = checkExecutionRisk({ venue: intent.venue, asset: intent.asset, notional: intent.notional, approved: intent.status === "approved" });
  if (!risk.allowed) return { ...intent, status: "blocked", rationale: `${intent.rationale}\nBlocked: ${risk.reason}` };
  return { ...intent, status: "executed" };
}

export function localTradingCapabilities(): LocalTradingCapabilities {
  return {
    defaultMode: "web_prepare_only",
    adapters: ["paper", "devnet", "polymarket-local-boundary", "exchange-api-interface"],
    requiresPairingToken: true,
    requiresUserApproval: true,
    secretsLocation: "local_only"
  };
}
