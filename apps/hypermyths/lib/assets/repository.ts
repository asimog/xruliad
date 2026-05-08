import { db } from "@/lib/db";
import type { TrailerAssetDocument } from "@/lib/types/domain";

function normalizeTrailerAsset(
  doc: NonNullable<Awaited<ReturnType<typeof db.trailerAsset.findUnique>>>,
): TrailerAssetDocument {
  return {
    id: doc.id,
    jobId: doc.jobId,
    creatorId: doc.creatorId,
    creatorEmail: doc.creatorEmail,
    ownerWallet: doc.ownerWallet,
    status: doc.status as TrailerAssetDocument["status"],
    visibility: (doc.visibility ?? "private") as TrailerAssetDocument["visibility"],
    slug: doc.slug,
    treeAddress: doc.treeAddress,
    collectionAddress: doc.collectionAddress,
    assetId: doc.assetId,
    mintSignature: doc.mintSignature,
    paymentAddress: doc.paymentAddress,
    quotedLamports: doc.quotedLamports,
    paidLamports: doc.paidLamports,
    paymentSignature: doc.paymentSignature,
    metadataUri: doc.metadataUri,
    metadataTxId: doc.metadataTxId,
    posterUri: doc.posterUri,
    posterTxId: doc.posterTxId,
    animationUri: doc.animationUri,
    mintedAt: doc.mintedAt?.toISOString() ?? null,
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    errorCode: doc.errorCode,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function getTrailerAssetByJobId(
  jobId: string,
): Promise<TrailerAssetDocument | null> {
  const doc = await db.trailerAsset.findUnique({ where: { jobId } });
  return doc ? normalizeTrailerAsset(doc) : null;
}

export async function getTrailerAssetBySlug(
  slug: string,
): Promise<TrailerAssetDocument | null> {
  const doc = await db.trailerAsset.findUnique({ where: { slug } });
  return doc ? normalizeTrailerAsset(doc) : null;
}

export async function upsertTrailerAsset(input: {
  jobId: string;
  creatorId?: string | null;
  creatorEmail?: string | null;
  ownerWallet?: string | null;
  status?: TrailerAssetDocument["status"];
  visibility?: TrailerAssetDocument["visibility"];
  slug?: string | null;
  treeAddress?: string | null;
  collectionAddress?: string | null;
  assetId?: string | null;
  mintSignature?: string | null;
  paymentAddress?: string | null;
  quotedLamports?: bigint;
  paidLamports?: bigint;
  paymentSignature?: string | null;
  metadataUri?: string | null;
  metadataTxId?: string | null;
  posterUri?: string | null;
  posterTxId?: string | null;
  animationUri?: string | null;
  mintedAt?: Date | null;
  publishedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<TrailerAssetDocument> {
  const doc = await db.trailerAsset.upsert({
    where: { jobId: input.jobId },
    create: {
      jobId: input.jobId,
      creatorId: input.creatorId ?? null,
      creatorEmail: input.creatorEmail ?? null,
      ownerWallet: input.ownerWallet ?? null,
      status: input.status ?? "draft",
      visibility: input.visibility ?? "private",
      slug: input.slug ?? null,
      treeAddress: input.treeAddress ?? null,
      collectionAddress: input.collectionAddress ?? null,
      assetId: input.assetId ?? null,
      mintSignature: input.mintSignature ?? null,
      paymentAddress: input.paymentAddress ?? null,
      quotedLamports: input.quotedLamports ?? BigInt(0),
      paidLamports: input.paidLamports ?? BigInt(0),
      paymentSignature: input.paymentSignature ?? null,
      metadataUri: input.metadataUri ?? null,
      metadataTxId: input.metadataTxId ?? null,
      posterUri: input.posterUri ?? null,
      posterTxId: input.posterTxId ?? null,
      animationUri: input.animationUri ?? null,
      mintedAt: input.mintedAt ?? null,
      publishedAt: input.publishedAt ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    },
    update: {
      creatorId: input.creatorId ?? undefined,
      creatorEmail: input.creatorEmail ?? undefined,
      ownerWallet: input.ownerWallet ?? undefined,
      status: input.status ?? undefined,
      visibility: input.visibility ?? undefined,
      slug: input.slug ?? undefined,
      treeAddress: input.treeAddress ?? undefined,
      collectionAddress: input.collectionAddress ?? undefined,
      assetId: input.assetId ?? undefined,
      mintSignature: input.mintSignature ?? undefined,
      paymentAddress: input.paymentAddress ?? undefined,
      quotedLamports: input.quotedLamports ?? undefined,
      paidLamports: input.paidLamports ?? undefined,
      paymentSignature: input.paymentSignature ?? undefined,
      metadataUri: input.metadataUri ?? undefined,
      metadataTxId: input.metadataTxId ?? undefined,
      posterUri: input.posterUri ?? undefined,
      posterTxId: input.posterTxId ?? undefined,
      animationUri: input.animationUri ?? undefined,
      mintedAt: input.mintedAt ?? undefined,
      publishedAt: input.publishedAt ?? undefined,
      errorCode: input.errorCode ?? undefined,
      errorMessage: input.errorMessage ?? undefined,
      updatedAt: new Date(),
    },
  });

  return normalizeTrailerAsset(doc);
}
