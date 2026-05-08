export type IkaStatus = { enabled: boolean; network: string; rpcUrl?: string; programId?: string; dWalletId?: string; policyId?: string; realPolicy: boolean };
export type IkaExecutionPolicy = { id: string; allowedVenues: string[]; allowedAssets: string[]; maxTradeSize?: number; requiresUserApproval: true };
export type IkaSigningIntent = { id: string; policyId?: string; localOnly: true; requiresApproval: true; payload: unknown };

export function readIkaStatus(env: NodeJS.ProcessEnv = process.env): IkaStatus {
  return { enabled: env.IKA_ENABLED === "true", network: env.IKA_NETWORK ?? "devnet", rpcUrl: env.IKA_RPC_URL, programId: env.IKA_PROGRAM_ID, dWalletId: env.IKA_DWALLET_ID, policyId: env.IKA_POLICY_ID, realPolicy: Boolean(env.IKA_PROGRAM_ID && env.IKA_POLICY_ID && env.IKA_ENABLED === "true") };
}

export function createIkaPolicy(input: Omit<IkaExecutionPolicy, "id" | "requiresUserApproval">): IkaExecutionPolicy {
  return { ...input, id: crypto.randomUUID(), requiresUserApproval: true };
}

export function createIkaSigningIntent(payload: unknown): IkaSigningIntent {
  return { id: crypto.randomUUID(), policyId: readIkaStatus().policyId, localOnly: true, requiresApproval: true, payload };
}
