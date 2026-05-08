import crypto from "crypto";

import type { PrivySession } from "@/lib/auth/privy-server";
import { getEnv } from "@/lib/env";
import type {
  JobDocument,
  ReportDocument,
  TrailerAssetDocument,
  VideoDocument,
} from "@/lib/types/domain";
import { uploadJsonToArweave, uploadRemoteFileToArweave } from "@/lib/onchain/arweave";
import { buildTrailerMetadata } from "@/lib/onchain/metadata";
import { mintTrailerCnft } from "@/lib/onchain/cnft";
import {
  deriveJobPaymentAddress,
  extractSolanaWalletFromPrivySession,
  getMintBundlePriceLamports,
  getTreasuryPaymentAddress,
  lamportsToSol,
  verifySolPaymentSignature,
} from "@/lib/onchain/solana";
import { getTrailerAssetByJobId, upsertTrailerAsset } from "./repository";

function buildSlug(jobId: string): string {
  return `trailer-${jobId.slice(0, 8)}-${crypto.randomBytes(3).toString("hex")}`;
}

export async function prepareTrailerAssetQuote(input: {
  job: JobDocument;
  session: PrivySession;
}): Promise<TrailerAssetDocument> {
  const ownerWallet = extractSolanaWalletFromPrivySession(input.session);
  if (!ownerWallet) {
    throw new Error("Connect a Solana wallet in Privy before minting.");
  }

  // Per-job address derived deterministically from authority secret + jobId.
  // Once assigned it never changes, so re-calling quote is idempotent.
  const jobPaymentAddress = deriveJobPaymentAddress(input.job.jobId);

  const existing = await getTrailerAssetByJobId(input.job.jobId);
  if (existing) {
    // Preserve confirmed/minted state; never downgrade payment_received.
    if (
      existing.status === "payment_received" ||
      existing.status === "metadata_uploaded" ||
      existing.status === "minted" ||
      existing.status === "published"
    ) {
      return existing;
    }
    return upsertTrailerAsset({
      jobId: input.job.jobId,
      creatorId: input.job.creatorId,
      creatorEmail: input.job.creatorEmail,
      ownerWallet,
      // Always use the job-derived address; fall back only if somehow missing
      paymentAddress: existing.paymentAddress ?? jobPaymentAddress,
      quotedLamports:
        existing.quotedLamports > BigInt(0)
          ? existing.quotedLamports
          : getMintBundlePriceLamports(),
      status: "payment_pending",
      visibility: "private",
      slug: existing.slug ?? buildSlug(input.job.jobId),
    });
  }

  return upsertTrailerAsset({
    jobId: input.job.jobId,
    creatorId: input.job.creatorId,
    creatorEmail: input.job.creatorEmail,
    ownerWallet,
    status: "payment_pending",
    visibility: "private",
    slug: buildSlug(input.job.jobId),
    paymentAddress: jobPaymentAddress,
    quotedLamports: getMintBundlePriceLamports(),
  });
}

export async function confirmTrailerAssetPayment(input: {
  job: JobDocument;
  session: PrivySession;
  signature: string;
}): Promise<TrailerAssetDocument> {
  const ownerWallet = extractSolanaWalletFromPrivySession(input.session);
  if (!ownerWallet) {
    throw new Error("Connect a Solana wallet in Privy before confirming payment.");
  }

  const asset = await prepareTrailerAssetQuote({
    job: input.job,
    session: input.session,
  });

  const verification = await verifySolPaymentSignature({
    signature: input.signature,
    expectedSender: ownerWallet,
    expectedRecipient: asset.paymentAddress ?? getTreasuryPaymentAddress(),
    minimumLamports: asset.quotedLamports,
  });

  return upsertTrailerAsset({
    jobId: input.job.jobId,
    ownerWallet,
    status: "payment_received",
    paidLamports: verification.paidLamports,
    paymentSignature: input.signature,
    errorCode: null,
    errorMessage: null,
  });
}

export async function mintTrailerAsset(input: {
  job: JobDocument;
  report: ReportDocument | null;
  video: VideoDocument;
  session: PrivySession;
}): Promise<TrailerAssetDocument> {
  const ownerWallet = extractSolanaWalletFromPrivySession(input.session);
  if (!ownerWallet) {
    throw new Error("Connect a Solana wallet in Privy before minting.");
  }

  // Load current asset state directly — do NOT call prepareTrailerAssetQuote here
  // because that function resets any non-minted asset back to payment_pending,
  // which would erase a confirmed payment_received status.
  const asset = await getTrailerAssetByJobId(input.job.jobId);
  if (!asset) {
    throw new Error("Trailer asset not found. Request a quote and complete payment first.");
  }

  if (
    asset.status !== "payment_received" &&
    asset.status !== "metadata_uploaded" &&
    asset.status !== "minted" &&
    asset.status !== "published"
  ) {
    throw new Error("Bundled SOL payment must be confirmed before minting.");
  }

  if (asset.status === "minted" || asset.status === "published") {
    return asset;
  }

  const env = getEnv();
  try {
    const trailerUrl = `${env.APP_BASE_URL}/trailer/${asset.slug}`;
    const poster = asset.posterUri
      ? { uri: asset.posterUri, txId: asset.posterTxId ?? "" }
      : await uploadRemoteFileToArweave({
          sourceUrl:
            input.video.thumbnailUrl ??
            input.job.subjectImage ??
            `${env.APP_BASE_URL}/opengraph-image.png`,
          contentType: "image/jpeg",
          tags: [
            { name: "App-Name", value: "HyperMyths" },
            { name: "Job-Id", value: input.job.jobId },
            { name: "Asset-Type", value: "poster" },
          ],
        });

    const metadataPayload = buildTrailerMetadata({
      job: input.job,
      report: input.report,
      video: input.video,
      asset,
      posterUri: poster.uri,
      animationUri: input.video.videoUrl ?? trailerUrl,
      externalUrl: trailerUrl,
    });
    const metadata = await uploadJsonToArweave({
      payload: metadataPayload,
      tags: [
        { name: "App-Name", value: "HyperMyths" },
        { name: "Job-Id", value: input.job.jobId },
        { name: "Asset-Type", value: "metadata" },
      ],
    });

    await upsertTrailerAsset({
      jobId: input.job.jobId,
      ownerWallet,
      status: "metadata_uploaded",
      metadataUri: metadata.uri,
      metadataTxId: metadata.txId,
      posterUri: poster.uri,
      posterTxId: poster.txId,
      animationUri: input.video.videoUrl ?? trailerUrl,
    });

    const mint = await mintTrailerCnft({
      ownerWallet,
      name: `${input.job.subjectName ?? "HyperMyths"} Trailer`,
      metadataUri: metadata.uri,
    });

    return upsertTrailerAsset({
      jobId: input.job.jobId,
      ownerWallet,
      status: "minted",
      treeAddress: mint.treeAddress,
      collectionAddress: mint.collectionAddress,
      assetId: mint.assetId,
      mintSignature: mint.signature,
      metadataUri: metadata.uri,
      metadataTxId: metadata.txId,
      posterUri: poster.uri,
      posterTxId: poster.txId,
      animationUri: input.video.videoUrl ?? trailerUrl,
      mintedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    });
  } catch (error) {
    await upsertTrailerAsset({
      jobId: input.job.jobId,
      ownerWallet,
      status: "failed",
      errorCode: "mint_failed",
      errorMessage: error instanceof Error ? error.message : "Mint failed.",
    });
    throw error;
  }
}

export async function publishTrailerAsset(input: {
  jobId: string;
}): Promise<TrailerAssetDocument> {
  const asset = await getTrailerAssetByJobId(input.jobId);
  if (!asset) {
    throw new Error("Trailer asset not found.");
  }
  if (asset.status !== "minted" && asset.status !== "published") {
    throw new Error("Mint the cNFT before publishing the trailer page.");
  }

  return upsertTrailerAsset({
    jobId: input.jobId,
    status: "published",
    visibility: "public",
    publishedAt: new Date(),
  });
}

export function buildMintPaymentSummary(asset: TrailerAssetDocument) {
  return {
    amountSol: lamportsToSol(asset.quotedLamports),
    receivedSol: lamportsToSol(asset.paidLamports),
    remainingSol: Math.max(
      0,
      lamportsToSol(
        asset.quotedLamports > asset.paidLamports
          ? asset.quotedLamports - asset.paidLamports
          : BigInt(0),
      ),
    ),
    paymentAddress: asset.paymentAddress ?? getTreasuryPaymentAddress(),
  };
}
