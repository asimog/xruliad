import Link from "next/link";
import { notFound } from "next/navigation";

import { UnifiedRouteShell } from "@/components/shell/UnifiedRouteShell";
import { getTrailerAssetBySlug } from "@/lib/assets/repository";
import { getJobArtifacts } from "@/lib/jobs/repository";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TrailerPage({ params }: PageProps) {
  const { slug } = await params;
  const asset = await getTrailerAssetBySlug(slug);
  if (!asset || asset.visibility !== "public" || asset.status !== "published") {
    notFound();
  }

  const artifacts = await getJobArtifacts(asset.jobId);
  if (!artifacts.job || !artifacts.video) {
    notFound();
  }

  const subject =
    artifacts.job.subjectName ??
    artifacts.job.subjectSymbol ??
    `Trailer ${artifacts.job.jobId.slice(0, 8)}`;

  return (
    <UnifiedRouteShell
      eyebrow="PUBLIC TRAILER"
      title={subject}
      subtitle="A published HyperMyths trailer with Solana ownership proof."
    >
      <div className="ux-stack">
        <div className="ux-result-card">
          <video
            controls
            playsInline
            preload="metadata"
            poster={artifacts.video.thumbnailUrl ?? undefined}
            className="job-video"
            src={artifacts.video.videoUrl ?? `/api/video/${asset.jobId}`}
          />
        </div>

        <div className="ux-result-card">
          <p>
            <strong>Onchain proof</strong>
          </p>
          <p>Asset ID: {asset.assetId ?? "Pending DAS indexing"}</p>
          <p>Owner wallet: {asset.ownerWallet ?? "Unknown"}</p>
          <p>Mint signature: {asset.mintSignature ?? "Unknown"}</p>
          <p>Metadata URI: {asset.metadataUri ?? "Unavailable"}</p>
        </div>

        {artifacts.report?.summary ? (
          <div className="ux-result-card">
            <p>{artifacts.report.summary}</p>
          </div>
        ) : null}

        <div className="ux-actions">
          {asset.metadataUri ? (
            <a className="ux-btn" href={asset.metadataUri} target="_blank" rel="noreferrer">
              View Metadata
            </a>
          ) : null}
          <Link className="ux-btn" href="/media">
            Open Trailer Studio
          </Link>
        </div>
      </div>
    </UnifiedRouteShell>
  );
}
