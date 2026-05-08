"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PaymentInstructionsCard } from "@/components/PaymentInstructionsCard";
import { UnifiedRouteShell } from "@/components/shell/UnifiedRouteShell";

type JobRecord = {
  jobId: string;
  status: string;
  progress: string;
  requestKind?: string | null;
  experience?: string | null;
  sceneCount?: number | null;
  visibility?: string | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectAddress?: string | null;
  subjectChain?: string | null;
  subjectDescription?: string | null;
  requestedPrompt?: string | null;
  sourceMediaUrl?: string | null;
  sourceMediaProvider?: string | null;
  updatedAt: string;
  errorMessage?: string | null;
  createdAt: string;
};

type ReportRecord = {
  summary?: string | null;
  downloadUrl?: string | null;
  subjectKind?: string | null;
  subjectAddress?: string | null;
  subjectChain?: string | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  sourceMediaUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  marketSnapshot?: {
    priceUsd?: number | null;
    marketCapUsd?: number | null;
    liquidityUsd?: number | null;
    volume24hUsd?: number | null;
    pairUrl?: string | null;
  } | null;
  tokenLinks?: Array<{
    label: string;
    url: string;
  }> | null;
};
type VideoRecord = {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  renderStatus?: string | null;
};
type AssetRecord = {
  id: string;
  jobId: string;
  ownerWallet?: string | null;
  status: string;
  visibility: string;
  slug?: string | null;
  treeAddress?: string | null;
  collectionAddress?: string | null;
  assetId?: string | null;
  mintSignature?: string | null;
  paymentAddress?: string | null;
  quotedLamports: string;
  paidLamports: string;
  paymentSignature?: string | null;
  metadataUri?: string | null;
  metadataTxId?: string | null;
  posterUri?: string | null;
  animationUri?: string | null;
  mintedAt?: string | null;
  publishedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type JobApiResponse = {
  job: JobRecord;
  report: ReportRecord | null;
  video: VideoRecord | null;
  asset?: AssetRecord | null;
  status: string;
  progress: string | null;
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  payment_pending: "Awaiting Payment",
  payment_received: "Payment Confirmed",
  metadata_uploaded: "Metadata Ready",
  minted: "Minted",
  published: "Published",
  failed: "Failed",
};

const PIPELINE_STAGES: { key: string; label: string }[] = [
  { key: "pending", label: "Queued" },
  { key: "fetching_transactions", label: "Reading source" },
  { key: "generating_report", label: "Shaping brief" },
  { key: "generating_script", label: "Writing story" },
  { key: "generating_video", label: "Rendering cut" },
  { key: "rendering_scene_1", label: "Rendering scene 1" },
  { key: "rendering_scene_2", label: "Rendering scene 2" },
  { key: "rendering_scene_3", label: "Rendering scene 3" },
  { key: "stitching_video", label: "Finishing edit" },
  { key: "uploading_assets", label: "Saving trailer" },
  { key: "complete", label: "Ready" },
];

function visiblePipelineStages(input: {
  experience?: string | null;
  sceneCount?: number | null;
}) {
  const isTwoAct =
    input.experience === "two_act_cinema" ||
    (typeof input.sceneCount === "number" && input.sceneCount <= 2);

  return PIPELINE_STAGES.filter((stage) => {
    if (isTwoAct && stage.key === "rendering_scene_3") return false;
    return true;
  });
}

function getStageIndex(
  stages: { key: string; label: string }[],
  progress: string | null | undefined,
): number {
  const idx = stages.findIndex((s) => s.key === (progress ?? "pending"));
  return idx === -1 ? 0 : idx;
}

function ProgressBar({
  progress,
  status,
  experience,
  sceneCount,
}: {
  progress: string | null | undefined;
  status: string;
  experience?: string | null;
  sceneCount?: number | null;
}) {
  const stages = visiblePipelineStages({ experience, sceneCount });
  const failed = status === "failed";
  const isComplete = status === "complete";
  const currentIdx = failed
    ? -1
    : getStageIndex(stages, isComplete ? "complete" : progress);

  return (
    <div className="job-progress-bar">
      <div className="job-progress-bar__header">
        <span className="job-progress-bar__label">Progress</span>
        {!isComplete && !failed ? (
          <span className="job-progress-bar__active-stage">
            {stages[currentIdx]?.label ?? "Processing"}…
          </span>
        ) : null}
        {failed ? (
          <span className="job-progress-bar__failed-label">Failed</span>
        ) : null}
      </div>

      <div className="job-progress-bar__track">
        {stages.map((stage, idx) => {
          const done = isComplete || (!failed && idx < currentIdx);
          const active = !isComplete && !failed && idx === currentIdx;

          let dotClass = "job-progress-bar__dot";
          if (failed) dotClass += " job-progress-bar__dot--failed";
          else if (done) dotClass += " job-progress-bar__dot--done";
          else if (active) dotClass += " job-progress-bar__dot--active";

          const connectorClass =
            "job-progress-bar__connector" +
            (done ? " job-progress-bar__connector--done" : "");

          return (
            <div key={stage.key} className="job-progress-bar__step">
              <div className={dotClass} title={stage.label} />
              {idx < PIPELINE_STAGES.length - 1 ? (
                <div className={connectorClass} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="job-progress-bar__stage-labels">
        <span className="job-progress-bar__stage-label">
          {PIPELINE_STAGES[0]!.label}
        </span>
        {!isComplete &&
        !failed &&
        currentIdx > 0 &&
        currentIdx < PIPELINE_STAGES.length - 1 ? (
          <span className="job-progress-bar__stage-label--active">
            {PIPELINE_STAGES[currentIdx]!.label}
          </span>
        ) : null}
        <span
          className={
            isComplete
              ? "job-progress-bar__stage-label--complete"
              : "job-progress-bar__stage-label"
          }
        >
          {PIPELINE_STAGES[PIPELINE_STAGES.length - 1]!.label}
        </span>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatUsd(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(value);
}

function statusDisplay(status: string | null | undefined) {
  switch (status) {
    case "complete":
      return "Ready";
    case "failed":
      return "Needs review";
    case "processing":
    case "in_progress":
      return "Rendering";
    case "awaiting_payment":
      return "Checkout";
    case "payment_confirmed":
      return "Payment confirmed";
    default:
      return "Queued";
  }
}

function failureMessage(message: string | null | undefined): string {
  const fallback =
    "We could not finish this trailer right now. Please try again shortly.";
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (
    normalized.includes("openrouter") ||
    normalized.includes("huggingface") ||
    normalized.includes("eliza") ||
    normalized.includes("xai") ||
    normalized.includes("api key") ||
    normalized.includes("quota") ||
    normalized.includes("credit") ||
    normalized.includes("<html") ||
    normalized.includes("cannot post") ||
    normalized.includes("provider")
  ) {
    return fallback;
  }

  return message;
}

function buildDexEmbedUrl(pairUrl: string | null | undefined): string | null {
  if (!pairUrl) {
    return null;
  }

  try {
    const url = new URL(pairUrl);
    url.searchParams.set("embed", "1");
    url.searchParams.set("loadChartSettings", "0");
    url.searchParams.set("chartLeftToolbar", "0");
    url.searchParams.set("theme", "dark");
    url.searchParams.set("chartTheme", "dark");
    url.searchParams.set("chartStyle", "0");
    url.searchParams.set("chartType", "usd");
    url.searchParams.set("interval", "15");
    return url.toString();
  } catch {
    return null;
  }
}

function lamportsToSolDisplay(value: string | null | undefined): number {
  const lamports = Number(value ?? "0");
  if (!Number.isFinite(lamports)) {
    return 0;
  }
  return lamports / 1_000_000_000;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

type JobPageClientProps = {
  jobId: string;
  initialData: JobApiResponse | null;
  initialError: string | null;
};

export default function JobPageClient({
  jobId,
  initialData,
  initialError,
}: JobPageClientProps) {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const [data, setData] = useState<JobApiResponse | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [protectedVideoUrl, setProtectedVideoUrl] = useState<string | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSignature, setAssetSignature] = useState("");
  const [assetAction, setAssetAction] = useState<
    null | "quote" | "confirm" | "mint" | "publish"
  >(null);
  const hasLoadedDataRef = useRef(Boolean(initialData));

  useEffect(() => {
    document.body.classList.add("show");
    return () => {
      document.body.classList.remove("show");
    };
  }, []);

  const isPrivateJob = data?.job.visibility === "private";
  const isScanJob =
    data?.job.requestKind === "token_scan" || data?.job.requestKind === "asset_scan";

  useEffect(() => {
    if (!jobId) return;
    if (data?.job.status === "failed") return;
    if (
      data?.job.status === "complete" &&
      (isScanJob || data?.video?.renderStatus === "ready")
    ) {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;
    let pollDelayMs = 3000;

    const load = async () => {
      try {
        const headers: Record<string, string> = {};
        if (authenticated) {
          const accessToken = await getAccessToken();
          if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
          }
        }

        const response = await fetch(`/api/jobs/${jobId}`, {
          cache: "no-store",
          credentials: "include",
          headers,
        });
        const payload = (await response.json()) as
          | JobApiResponse
          | { error?: string; message?: string };

        if (!response.ok) {
          const failure = payload as { error?: string; message?: string };
          const message =
            response.status === 401 || response.status === 403
              ? "Sign in to view this private Creator Studio trailer."
              : failure.error ?? failure.message ?? "Failed to load trailer.";

          if (!cancelled) {
            if (!authenticated || !ready) {
              setError(message);
            } else if (!hasLoadedDataRef.current) {
              setError(message);
            }
          }
          return;
        }

        const next = payload as JobApiResponse;
        if (!cancelled) {
          hasLoadedDataRef.current = true;
          setData(next);
          setError(null);
        }

        const reportReady =
          (next.job.requestKind === "token_scan" || next.job.requestKind === "asset_scan") &&
          next.job.status === "complete";
        const videoReady = next.video?.renderStatus === "ready";
        if (
          next.job.status === "failed" ||
          reportReady ||
          (next.job.status === "complete" && videoReady)
        ) {
          if (timerId) window.clearTimeout(timerId);
          return;
        }

        if (!cancelled) {
          pollDelayMs = Math.min(15000, Math.round(pollDelayMs * 1.35));
          timerId = window.setTimeout(() => {
            void load();
          }, pollDelayMs);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load trailer.");
          pollDelayMs = Math.min(15000, Math.round(pollDelayMs * 1.5));
          timerId = window.setTimeout(() => {
            void load();
          }, pollDelayMs);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [
    authenticated,
    data?.job.status,
    data?.video?.renderStatus,
    getAccessToken,
    isScanJob,
    jobId,
    ready,
  ]);

  useEffect(() => {
    if (!jobId || !data || data.job.visibility !== "private") {
      setProtectedVideoUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    if (data.job.status !== "complete" || data.video?.renderStatus !== "ready") {
      return;
    }

    if (!ready || !authenticated) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadProtectedVideo = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;

        const response = await fetch(`/api/video/${jobId}`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load private video.");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setProtectedVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return objectUrl;
          });
        }
      } catch (videoError) {
        if (!cancelled) {
          setError(
            videoError instanceof Error
              ? videoError.message
              : "Failed to load private video.",
          );
        }
      }
    };

    void loadProtectedVideo();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [authenticated, data, getAccessToken, jobId, ready]);

  const title = useMemo(
    () =>
      data?.job.subjectName ??
      data?.job.subjectSymbol ??
      (jobId
        ? `${isScanJob ? "Scan" : "Trailer"} ${jobId.slice(0, 8)}`
        : isScanJob
          ? "Scan"
          : "Trailer"),
    [data, isScanJob, jobId],
  );

  const isComplete = data?.job.status === "complete";
  const isFailed = data?.job.status === "failed";
  const hasVideo = !isScanJob && isComplete && data?.video?.renderStatus === "ready";
  const videoSrc =
    isPrivateJob && protectedVideoUrl
      ? protectedVideoUrl
      : !isPrivateJob && jobId
        ? `/api/video/${jobId}`
        : null;
  const reportHref =
    !isScanJob && !isPrivateJob && isComplete && jobId ? `/api/report/${jobId}` : null;
  const report = data?.report ?? null;
  const asset = data?.asset ?? null;
  const tokenChartUrl = buildDexEmbedUrl(report?.marketSnapshot?.pairUrl);
  const isTokenJob = data?.job.requestKind === "token_video";
  const isTokenLikeJob = isTokenJob || isScanJob;
  const isWalletJob = data?.job.requestKind === "wallet_recap";
  const isProfileJob = data?.job.requestKind === "mythx";
  const isImageJob = data?.job.sourceMediaProvider === "image";

  const chipClass =
    isFailed ? "ux-live-chip ux-live-chip--off" : "ux-live-chip ux-live-chip--on";

  async function refreshJob() {
    const headers: Record<string, string> = {};
    if (authenticated) {
      const accessToken = await getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    const response = await fetch(`/api/jobs/${jobId}`, {
      cache: "no-store",
      credentials: "include",
      headers,
    });

    const payload = (await response.json()) as JobApiResponse | { error?: string };
    if (!response.ok) {
      throw new Error((payload as { error?: string }).error ?? "Failed to refresh trailer.");
    }

    setData(payload as JobApiResponse);
  }

  async function postAssetAction(path: string, body?: Record<string, unknown>) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Sign in to manage trailer collecting.");
    }

    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : JSON.stringify({}),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Collectible action failed.");
    }

    await refreshJob();
  }

  async function runAssetAction(
    nextAction: "quote" | "confirm" | "mint" | "publish",
  ) {
    setAssetAction(nextAction);
    setAssetError(null);
    try {
      if (nextAction === "quote") {
        await postAssetAction(`/api/assets/${jobId}/quote`);
      } else if (nextAction === "confirm") {
        await postAssetAction(`/api/assets/${jobId}/confirm-payment`, {
          signature: assetSignature.trim(),
        });
      } else if (nextAction === "mint") {
        await postAssetAction(`/api/assets/${jobId}/mint`);
      } else if (nextAction === "publish") {
        await postAssetAction(`/api/assets/${jobId}/publish`);
      }
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Collectible action failed.");
    } finally {
      setAssetAction(null);
    }
  }

  async function downloadPrivateReport() {
    if (!jobId) return;

    setIsDownloadingReport(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Sign in to download this private report.");
      }

      const response = await fetch(`/api/report/${jobId}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download the private report.");
      }

      const blob = await response.blob();
      triggerBlobDownload(blob, `hypermyths-${jobId}.pdf`);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download the private report.",
      );
    } finally {
      setIsDownloadingReport(false);
    }
  }

  return (
    <UnifiedRouteShell
      eyebrow={isScanJob ? "SCANNER" : "TRAILER"}
      title={title}
      subtitle={
        isScanJob
          ? "Review the saved asset scan report and market signals."
          : "Watch your trailer move from brief to finished cut."
      }
      status={
        data ? <div className={chipClass}>{statusDisplay(data.job.status)}</div> : null
      }
    >
      <div className="ux-stack">
        {Boolean(error) && !hasVideo ? (
          <div className="ux-error-card">{error}</div>
        ) : null}

        {!data && !error ? (
          <div className="ux-result-card">
            {isScanJob ? "Loading scanner report..." : "Loading trailer progress..."}
          </div>
        ) : null}

        {isPrivateJob && ready && !authenticated ? (
          <div className="ux-result-card">
            <p>This is a private Creator Studio trailer. Sign in to view the finished cut.</p>
            <div className="ux-actions">
              <button
                type="button"
                className="ux-btn ux-btn--primary"
                onClick={() => void login()}
              >
                Sign In
              </button>
            </div>
          </div>
        ) : null}

        {data ? (
          <>
            {isScanJob ? (
              <div className="ux-result-card">
                <p>
                  <strong>Scanner report ready</strong>
                </p>
                <p>
                  This feed card is a saved asset scan. It has no trailer render attached.
                </p>
              </div>
            ) : (
              <ProgressBar
                progress={data.job.progress}
                status={data.job.status}
                experience={data.job.experience}
                sceneCount={data.job.sceneCount}
              />
            )}

            <div className="ux-result-card">
              <p>
                <strong>{data.job.subjectName ?? title}</strong>
              </p>
              <p>Started: {formatDate(data.job.createdAt)}</p>
              {isFailed ? (
                <p className="ux-feed-progress job-error-message">
                  {failureMessage(data.job.errorMessage)}
                </p>
              ) : null}
            </div>

            <div className="ux-result-card">
              <p>
                <strong>Source</strong>
              </p>
              {isTokenLikeJob ? (
                <>
                  <p>
                    {report?.subjectName ?? data.job.subjectName ?? "Token"}
                    {report?.subjectSymbol ?? data.job.subjectSymbol
                      ? ` (${report?.subjectSymbol ?? data.job.subjectSymbol})`
                      : null}
                  </p>
                  <p>
                    {report?.subjectAddress ?? data.job.subjectAddress ?? "Contract unknown"}{" "}
                    on {report?.subjectChain ?? data.job.subjectChain ?? "unknown chain"}
                  </p>
                </>
              ) : null}
              {isWalletJob ? (
                <p>{report?.subjectAddress ?? data.job.subjectAddress ?? "Wallet unknown"}</p>
              ) : null}
              {isProfileJob ? (
                <p>{report?.sourceMediaUrl ?? data.job.sourceMediaUrl ?? "X profile"}</p>
              ) : null}
              {isImageJob ? (
                <p>{report?.sourceMediaUrl ?? data.job.sourceMediaUrl ?? "Reference image"}</p>
              ) : null}
              {report?.sourceTranscript ? (
                <p className="ux-feed-progress">
                  {report.sourceTranscript.length > 280
                    ? `${report.sourceTranscript.slice(0, 279)}...`
                    : report.sourceTranscript}
                </p>
              ) : null}
            </div>

            <div className="ux-actions">
              {hasVideo && videoSrc ? (
                <a
                  className="ux-btn ux-btn--primary"
                  href={videoSrc}
                  download={`${jobId}.mp4`}
                >
                  Download Video
                </a>
              ) : null}
              {reportHref ? (
                <Link className="ux-btn" href={reportHref}>
                  Open Report
                </Link>
              ) : null}
              {isPrivateJob && isComplete ? (
                <button
                  type="button"
                  className="ux-btn"
                  onClick={() => void downloadPrivateReport()}
                  disabled={isDownloadingReport}
                >
                  {isDownloadingReport ? "Preparing report..." : "Download Report"}
                </button>
              ) : null}
              <Link className="ux-btn" href="/feed">
                Back to Feed
              </Link>
            </div>

            {hasVideo && videoSrc ? (
              <div className="ux-result-card">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={data.video?.thumbnailUrl ?? undefined}
                  className="job-video"
                  src={videoSrc}
                />
              </div>
            ) : null}

            {data.report?.summary ? (
              <div className="ux-result-card">
                <p>{data.report.summary}</p>
              </div>
            ) : null}

            {isPrivateJob && hasVideo ? (
              <div className="ux-result-card">
                <p>
                  <strong>Collect</strong>
                </p>
                <p>
                  Publish this trailer as a Solana collectible. One payment covers storage and minting, then we send it to your connected wallet.
                </p>
                {asset ? (
                  <>
                    <p>Status: {ASSET_STATUS_LABELS[asset.status] ?? asset.status.replaceAll("_", " ")}</p>
                    {asset.ownerWallet ? <p>Wallet: {asset.ownerWallet}</p> : null}
                    {asset.assetId ? <p>Collectible ID: {asset.assetId}</p> : null}
                    {asset.errorMessage ? <p>{asset.errorMessage}</p> : null}
                    {asset.slug && asset.visibility === "public" ? (
                      <p>
                        <Link href={`/trailer/${asset.slug}`}>View public trailer page</Link>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p>Not yet collected.</p>
                )}

                {!asset || asset.status === "draft" || asset.status === "failed" ? (
                  <div className="ux-actions">
                    <button
                      type="button"
                      className="ux-btn ux-btn--primary"
                      onClick={() => void runAssetAction("quote")}
                      disabled={assetAction !== null}
                    >
                      {assetAction === "quote" ? "Preparing..." : "Get Collection Quote"}
                    </button>
                  </div>
                ) : null}

                {asset &&
                asset.status !== "draft" &&
                asset.status !== "minted" &&
                asset.status !== "published" ? (
                  <PaymentInstructionsCard
                    amountSol={lamportsToSolDisplay(asset.quotedLamports)}
                    paymentAddress={asset.paymentAddress ?? "Unavailable"}
                    jobId={asset.jobId}
                    receivedSol={lamportsToSolDisplay(asset.paidLamports)}
                    remainingSol={Math.max(
                      0,
                      lamportsToSolDisplay(asset.quotedLamports) -
                        lamportsToSolDisplay(asset.paidLamports),
                    )}
                    statusText={ASSET_STATUS_LABELS[asset.status] ?? asset.status.replaceAll("_", " ")}
                  />
                ) : null}

                {asset &&
                asset.status !== "payment_received" &&
                asset.status !== "minted" &&
                asset.status !== "published" ? (
                  <div className="ux-field">
                    <label htmlFor="mint-payment-signature" className="ux-label">
                      Transaction ID
                    </label>
                    <input
                      id="mint-payment-signature"
                      className="ux-input"
                      value={assetSignature}
                      onChange={(event) => setAssetSignature(event.target.value)}
                      placeholder="Paste your Solana transaction ID"
                    />
                    <div className="ux-actions">
                      <button
                        type="button"
                        className="ux-btn ux-btn--primary"
                        onClick={() => void runAssetAction("confirm")}
                        disabled={assetAction !== null || assetSignature.trim().length === 0}
                      >
                        {assetAction === "confirm"
                          ? "Confirming payment..."
                          : "Confirm Payment"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {asset && asset.status === "payment_received" ? (
                  <div className="ux-actions">
                    <button
                      type="button"
                      className="ux-btn ux-btn--primary"
                      onClick={() => void runAssetAction("mint")}
                      disabled={assetAction !== null}
                    >
                      {assetAction === "mint" ? "Minting..." : "Create Collectible"}
                    </button>
                  </div>
                ) : null}

                {asset && asset.status === "minted" ? (
                  <div className="ux-actions">
                    <button
                      type="button"
                      className="ux-btn ux-btn--primary"
                      onClick={() => void runAssetAction("publish")}
                      disabled={assetAction !== null}
                    >
                      {assetAction === "publish"
                        ? "Publishing trailer..."
                        : "Publish Trailer"}
                    </button>
                  </div>
                ) : null}

                {assetError ? <div className="ux-error-card">{assetError}</div> : null}
              </div>
            ) : null}

            {isTokenLikeJob ? (
              <div className="ux-result-card">
                <p>
                  <strong>{isScanJob ? "Scanner Signals" : "Token Activity"}</strong>
                </p>
                <p>
                  Price: {formatUsd(report?.marketSnapshot?.priceUsd) ?? "N/A"}{" "}
                  • Market Cap: {formatUsd(report?.marketSnapshot?.marketCapUsd) ?? "N/A"}{" "}
                  • Liquidity: {formatUsd(report?.marketSnapshot?.liquidityUsd) ?? "N/A"}{" "}
                  • 24h Volume: {formatUsd(report?.marketSnapshot?.volume24hUsd) ?? "N/A"}
                </p>
                {report?.marketSnapshot?.pairUrl ? (
                  <p>
                    <a
                      className="ux-btn"
                      href={report.marketSnapshot.pairUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open DexScreener
                    </a>
                  </p>
                ) : null}
                {tokenChartUrl ? (
                  <iframe
                    title="DexScreener chart"
                    src={tokenChartUrl}
                    style={{
                      width: "100%",
                      minHeight: "540px",
                      border: 0,
                      borderRadius: "16px",
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </UnifiedRouteShell>
  );
}
