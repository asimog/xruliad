import { JobStatus } from "@/lib/types/domain";

const transitions: Record<JobStatus, JobStatus[]> = {
  awaiting_payment: ["payment_confirmed", "failed"],
  payment_confirmed: ["processing", "failed"],
  pending: ["processing", "failed"],
  processing: ["complete", "failed"],
  complete: [],
  failed: ["pending", "awaiting_payment"], // allow retry from failed
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid job transition from ${from} to ${to}`);
  }
}
