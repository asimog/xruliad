import { readQvacStatus } from "@hypermyths/qvac";

export type QvacAgentTask = { id: string; prompt: string; privacy: "public" | "private_strategy"; status: "queued" | "requires_qvac" | "ready" };

export function createQvacAgentTask(input: { prompt: string; privacy: QvacAgentTask["privacy"] }): QvacAgentTask {
  const status = readQvacStatus();
  return { id: crypto.randomUUID(), prompt: input.prompt, privacy: input.privacy, status: input.privacy === "private_strategy" && !status.paired ? "requires_qvac" : "queued" };
}
