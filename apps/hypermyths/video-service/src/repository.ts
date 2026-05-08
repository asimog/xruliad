import type { VideoRender, Prisma } from "@prisma/client";
import { db } from "./db";
import { PrismaClient } from "@prisma/client";
import {
  NormalizedRenderRequest,
  RenderJobRecord,
  RenderStatus,
} from "./types";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRecord(
  record: VideoRender | null,
  request?: NormalizedRenderRequest,
): RenderJobRecord {
  const status = (record?.status ??
    record?.renderStatus ??
    "queued") as RenderStatus;
  const renderStatus = (record?.renderStatus ??
    record?.status ??
    "queued") as RenderStatus;
  return {
    id: record!.id,
    jobId: record!.jobId,
    status,
    renderStatus,
    videoUrl: record!.videoUrl ?? null,
    thumbnailUrl: record!.thumbnailUrl ?? null,
    error: record!.error ?? null,
    createdAt: record!.createdAt.toISOString(),
    updatedAt: record!.updatedAt.toISOString(),
    startedAt: record!.startedAt ? record!.startedAt.toISOString() : null,
    completedAt: record!.completedAt ? record!.completedAt.toISOString() : null,
    request: request ?? ({} as NormalizedRenderRequest),
  };
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStoredRequest(record: VideoRender | null): NormalizedRenderRequest | undefined {
  if (!record) {
    return undefined;
  }

  const candidate = (record as unknown as { request?: NormalizedRenderRequest })
    .request;
  return candidate ? stripUndefined(candidate) : undefined;
}

/**
 * Try to find a VideoRender record by primary key `id` first,
 * then fall back to unique constraint `jobId`. Returns null if neither matches.
 */
async function findVideoRenderByIdOrJobId(
  dbOrTx: TxClient | typeof db,
  value: string,
): Promise<VideoRender | null> {
  // Try primary key first
  const byId = await dbOrTx.videoRender.findUnique({ where: { id: value } });
  if (byId) return byId;
  // Fall back to jobId unique constraint
  return dbOrTx.videoRender.findUnique({ where: { jobId: value } });
}

export async function getRenderJob(
  id: string,
): Promise<RenderJobRecord | null> {
  const record = await findVideoRenderByIdOrJobId(db, id);
  if (!record) return null;

  return normalizeRecord(record, readStoredRequest(record));
}

export async function createOrGetRenderJob(
  jobId: string,
  request: NormalizedRenderRequest,
): Promise<{ record: RenderJobRecord; created: boolean }> {
  const sanitizedRequest = stripUndefined(request);
  const now = new Date();

  return db.$transaction(async (tx: TxClient) => {
    const existing = await tx.videoRender.findUnique({ where: { jobId } });
    if (existing) {
      const existingRequest = readStoredRequest(existing) ?? sanitizedRequest;
      if (!readStoredRequest(existing)) {
        await tx.videoRender.update({
          where: { id: existing.id },
          data: ({
            request: existingRequest as unknown as Prisma.InputJsonValue,
            updatedAt: now,
          }) as Prisma.VideoRenderUpdateInput,
        });
      }
      return {
        record: normalizeRecord(existing, existingRequest),
        created: false,
      };
    }

    const record = await tx.videoRender.create({
      data: ({
        id: jobId,
        jobId,
        status: "queued",
        renderStatus: "queued",
        request: sanitizedRequest as unknown as Prisma.InputJsonValue,
        videoUrl: null,
        thumbnailUrl: null,
        error: null,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
      }) as Prisma.VideoRenderUncheckedCreateInput,
    });

    return {
      record: normalizeRecord(record, sanitizedRequest),
      created: true,
    };
  });
}

export async function updateRenderJob(
  id: string,
  patch: Partial<Omit<RenderJobRecord, "id" | "jobId" | "createdAt">>,
): Promise<void> {
  const data: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.renderStatus !== undefined) data.renderStatus = patch.renderStatus;
  if (patch.videoUrl !== undefined) data.videoUrl = patch.videoUrl;
  if (patch.thumbnailUrl !== undefined) data.thumbnailUrl = patch.thumbnailUrl;
  if (patch.error !== undefined) data.error = patch.error;
  if (patch.startedAt !== undefined)
    data.startedAt = patch.startedAt ? new Date(patch.startedAt) : null;
  if (patch.completedAt !== undefined)
    data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
  if (patch.request !== undefined) {
    data.request = stripUndefined(patch.request) as unknown as Prisma.InputJsonValue;
  }

  const existing = await findVideoRenderByIdOrJobId(db, id);
  if (!existing) {
    throw new Error(`Render job not found: ${id}`);
  }

  await db.videoRender.update({
    where: { id: existing.id },
    data,
  });
}

export async function markRenderProcessing(id: string): Promise<void> {
  await updateRenderJob(id, {
    status: "processing",
    renderStatus: "processing",
    startedAt: nowIso(),
    error: null,
  });
}

export async function markRenderReady(
  id: string,
  result: { videoUrl: string; thumbnailUrl: string | null },
): Promise<void> {
  await updateRenderJob(id, {
    status: "ready",
    renderStatus: "ready",
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    completedAt: nowIso(),
    error: null,
  });
}

export async function markRenderFailed(
  id: string,
  error: string,
): Promise<void> {
  await updateRenderJob(id, {
    status: "failed",
    renderStatus: "failed",
    error,
    completedAt: nowIso(),
  });
}

export async function claimRenderJob(
  id: string,
  staleAfterMs: number,
): Promise<RenderJobRecord | null> {
  return db.$transaction(async (tx: TxClient) => {
    const existing = await findVideoRenderByIdOrJobId(tx, id);
    if (!existing) return null;

    const currentStatus = existing.status as RenderStatus;
    if (currentStatus === "ready" || currentStatus === "failed") {
      return null;
    }

    if (currentStatus === "processing") {
      const updatedAtMs = existing.updatedAt.getTime();
      if (
        Number.isFinite(updatedAtMs) &&
        Date.now() - updatedAtMs < staleAfterMs
      ) {
        return null;
      }
    }

    const now = new Date();
    const updated = await tx.videoRender.update({
      where: { id: existing.id },
      data: {
        status: "processing",
        renderStatus: "processing",
        startedAt: existing.startedAt ?? now,
        updatedAt: now,
        error: null,
      },
    });

    return normalizeRecord(updated, readStoredRequest(updated));
  });
}

export async function touchRenderJob(id: string): Promise<void> {
  await updateRenderJob(id, {});
}

export async function listRecoverableRenderJobs(params: {
  limit: number;
  staleAfterMs: number;
}): Promise<RenderJobRecord[]> {
  const records = await db.videoRender.findMany({
    where: {
      status: { in: ["queued", "processing"] },
    },
    take: params.limit,
  });

  const now = Date.now();
  return records
    .map((record) => normalizeRecord(record, readStoredRequest(record)))
    .filter((record) => {
      if (record.status === "queued") {
        return true;
      }
      const updatedAtMs = Date.parse(record.updatedAt);
      if (!Number.isFinite(updatedAtMs)) {
        return true;
      }
      return now - updatedAtMs >= params.staleAfterMs;
    });
}
