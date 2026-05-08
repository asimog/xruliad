import type { ProductId } from "@hypermyths/theme";

export type CommandType = "market_thesis" | "prediction_thesis" | "rwa_thesis" | "research_thesis" | "video_request" | "ad_campaign" | "simulation_request" | "coding_task" | "testing_task" | "model_eval" | "data_contribution" | "user_agent_task";
export type CommandStatus = "draft" | "quoted" | "running" | "waiting_for_contribution" | "complete" | "failed" | "exported_local_intent";
export type CommandPermission = "public" | "private" | "permissioned" | "local_only";
export type ContributionReceipt = { id: string; attribution: string; costUsd?: number; createdAt: string };
export type CommandContribution = { id: string; commandId: string; contributor: string; kind: "evidence" | "model_output" | "ad" | "video" | "research_task" | "simulation" | "code" | "review"; payload: unknown; receipt: ContributionReceipt };
export type Command = { id: string; productId: ProductId; type: CommandType; title: string; prompt: string; status: CommandStatus; permission: CommandPermission; createdAt: string };
export type CommandRun = { id: string; commandId: string; status: CommandStatus; route: string; costUsd?: number; output?: unknown };

export function createCommand(input: Omit<Command, "id" | "status" | "createdAt"> & { status?: CommandStatus }): Command {
  return { ...input, id: crypto.randomUUID(), status: input.status ?? "draft", createdAt: new Date().toISOString() };
}

export function contributeToCommand(input: Omit<CommandContribution, "id" | "receipt">): CommandContribution {
  return { ...input, id: crypto.randomUUID(), receipt: { id: crypto.randomUUID(), attribution: input.contributor, createdAt: new Date().toISOString() } };
}

export function exportCommandLocalIntent(command: Command) {
  return { id: crypto.randomUUID(), commandId: command.id, mode: "web_prepare_only", requiresLocalExecutionGateway: true, executableOnWeb: false };
}
