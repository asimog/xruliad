import type {
  JobDocument,
  ReportDocument,
  TrailerAssetDocument,
  VideoDocument,
} from "@/lib/types/domain";

function buildAttributes(input: {
  job: JobDocument;
  report: ReportDocument | null;
  asset: TrailerAssetDocument;
}): Array<{ trait_type: string; value: string }> {
  const sourceValue =
    input.job.requestKind === "token_video"
      ? input.job.subjectAddress
      : input.job.requestKind === "wallet_recap"
        ? input.job.wallet
        : input.job.sourceMediaUrl ?? input.job.requestedPrompt ?? "unknown";

  const attributes: Array<{ trait_type: string; value: string }> = [
    {
      trait_type: "source_kind",
      value: input.job.requestKind ?? "unknown",
    },
    {
      trait_type: "source_value",
      value: sourceValue ?? "unknown",
    },
    {
      trait_type: "job_id",
      value: input.job.jobId,
    },
    {
      trait_type: "visibility_origin",
      value: input.job.visibility ?? "private",
    },
  ];

  if (input.job.requestKind === "token_video") {
    attributes.push({
      trait_type: "data_providers",
      value: "DexScreener",
    });
  } else if (input.job.requestKind === "wallet_recap") {
    attributes.push({
      trait_type: "data_providers",
      value: "Helius,DexScreener",
    });
  } else if (input.job.requestKind === "mythx") {
    attributes.push({
      trait_type: "data_providers",
      value: "X",
    });
  }

  if (input.report?.marketSnapshot?.pairUrl) {
    attributes.push({
      trait_type: "has_market_snapshot",
      value: "true",
    });
  }

  return attributes;
}

export function buildTrailerMetadata(input: {
  job: JobDocument;
  report: ReportDocument | null;
  video: VideoDocument;
  asset: TrailerAssetDocument;
  posterUri: string;
  animationUri: string;
  externalUrl: string;
}): Record<string, unknown> {
  const subject =
    input.job.subjectName ??
    input.report?.subjectName ??
    input.job.subjectSymbol ??
    "HyperMyths Trailer";

  const description =
    input.job.subjectDescription ??
    input.report?.summary ??
    "A cinematic trailer minted from HyperMyths.";

  return {
    name: `${subject} Trailer`,
    symbol: "MYTH",
    description,
    image: input.posterUri,
    animation_url: input.externalUrl,
    external_url: input.externalUrl,
    attributes: buildAttributes(input),
    properties: {
      category: "video",
      files: [
        {
          uri: input.posterUri,
          type: "image/jpeg",
        },
      ],
    },
  };
}
