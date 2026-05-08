import type { TrailerAssetDocument } from "@/lib/types/domain";

export type TrailerAssetApiDocument = Omit<
  TrailerAssetDocument,
  "quotedLamports" | "paidLamports"
> & {
  quotedLamports: string;
  paidLamports: string;
};

export function serializeTrailerAsset(
  asset: TrailerAssetDocument | null,
): TrailerAssetApiDocument | null {
  if (!asset) {
    return null;
  }

  return {
    ...asset,
    quotedLamports: asset.quotedLamports.toString(),
    paidLamports: asset.paidLamports.toString(),
  };
}
