import { authorizePrivateJobAccess } from "@/lib/auth/private-job-access";
import { getJob, getVideo } from "@/lib/jobs/repository";
import {
  extractS3KeyFromUrl,
  generateSignedVideoUrl,
  getProviderAuthHeaders,
  isEphemeralProviderUrl,
} from "@/lib/storage/s3";
import { logger } from "@/lib/logging/logger";
import { isAllowedStoredRedirectUrl } from "@/lib/security/url-allowlist";
import { NextRequest, NextResponse } from "next/server";
import { existsSync, createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";

export const runtime = "nodejs";

const RAILWAY_VIDEO_DIR = "/data/videos";

type Context = {
  params: Promise<{ jobId: string }>;
};

function getLocalVideoPath(jobId: string): string {
  return `${RAILWAY_VIDEO_DIR}/${jobId}.mp4`;
}

export async function GET(request: NextRequest, context: Context) {
  const { jobId } = await context.params;

  // Check if caller wants the raw video file
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true";

  const video = await getVideo(jobId);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  const job = await getJob(jobId);
  const access = await authorizePrivateJobAccess({
    request,
    job,
    route: "/api/video/[jobId]",
  });
  if (!access.ok) {
    return access.response;
  }

  // Still rendering — return status JSON
  if (!video.videoUrl && video.renderStatus !== "ready") {
    const effectiveStatus =
      job?.status === "failed" ? "failed" : video.renderStatus;
    return NextResponse.json(
      {
        jobId,
        status: effectiveStatus,
        error:
          effectiveStatus === "failed"
            ? "Video generation failed"
            : undefined,
      },
      { status: effectiveStatus === "failed" ? 500 : 409 },
    );
  }

  // Try serving from Railway Persistent Volume first
  if (download || video.renderStatus === "ready") {
    const localPath = getLocalVideoPath(jobId);
    if (existsSync(localPath)) {
      const fileStats = await stat(localPath);
      const stream = createReadStream(localPath);
      const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

      const response = new NextResponse(webStream, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(fileStats.size),
          "Content-Disposition": download
            ? `attachment; filename="${jobId}.mp4"`
            : "inline",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Accept-Ranges": "bytes",
        },
      });

      // Clean up file stream on client disconnect.
      request.signal.addEventListener(
        "abort",
        () => {
          if (!stream.destroyed) {
            stream.destroy();
          }
        },
        { once: true },
      );
      stream.once("error", () => {
        if (!stream.destroyed) {
          stream.destroy();
        }
      });

      return response;
    }
  }

  // Fallback: redirect to remote URL if available.
  // If the stored URL is a Supabase path on a private bucket, generate a
  // short-lived signed URL instead of redirecting to the (broken) public URL.
  if (video.videoUrl) {
    const s3Key = extractS3KeyFromUrl(video.videoUrl);
    if (s3Key) {
      const signed = await generateSignedVideoUrl(s3Key);
      if (signed) return NextResponse.redirect(signed, 302);
    }

    // If the stored URL points at a provider CDN (OpenRouter, xAI, Replicate,
    // …) we cannot 302 the browser to it — those hosts require Authorization
    // headers the browser will not send. Stream the bytes through this route
    // with the right auth header attached.
    if (isEphemeralProviderUrl(video.videoUrl)) {
      const rangeHeader = request.headers.get("range");
      const upstreamHeaders: Record<string, string> = {
        ...getProviderAuthHeaders(video.videoUrl),
      };
      if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

      let upstream: Response;
      try {
        upstream = await fetch(video.videoUrl, {
          headers: upstreamHeaders,
          signal: request.signal,
        });
      } catch (error) {
        logger.warn("video_proxy_upstream_fetch_failed", {
          jobId,
          errorMessage:
            error instanceof Error ? error.message : "unknown error",
        });
        return NextResponse.json(
          { error: "Upstream video fetch failed" },
          { status: 502 },
        );
      }

      if (!upstream.ok || !upstream.body) {
        logger.warn("video_proxy_upstream_not_ok", {
          jobId,
          status: upstream.status,
        });
        return NextResponse.json(
          { error: "Upstream video unavailable", status: upstream.status },
          { status: upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status },
        );
      }

      const passHeaders: Record<string, string> = {
        "Content-Type":
          upstream.headers.get("content-type") ?? "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=300",
      };
      const len = upstream.headers.get("content-length");
      if (len) passHeaders["Content-Length"] = len;
      const range = upstream.headers.get("content-range");
      if (range) passHeaders["Content-Range"] = range;
      const disposition = download
        ? `attachment; filename="${jobId}.mp4"`
        : "inline";
      passHeaders["Content-Disposition"] = disposition;

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: passHeaders,
      });
    }

    if (isAllowedStoredRedirectUrl(video.videoUrl, request.url)) {
      return NextResponse.redirect(video.videoUrl, 302);
    }

    logger.warn("video_redirect_blocked", { jobId });
    return NextResponse.json(
      { error: "Stored video URL is not on an allowed host." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { error: "Video is still rendering", status: video.renderStatus },
    { status: 409 },
  );
}

export async function HEAD(request: NextRequest, context: Context) {
  const { jobId } = await context.params;
  const localPath = getLocalVideoPath(jobId);
  const video = await getVideo(jobId);

  if (!video) {
    return new NextResponse(null, { status: 404 });
  }

  const headJob = await getJob(jobId);
  const headAccess = await authorizePrivateJobAccess({
    request,
    job: headJob,
    route: "/api/video/[jobId] HEAD",
  });
  if (!headAccess.ok) {
    return new NextResponse(null, { status: headAccess.response.status });
  }

  if (existsSync(localPath)) {
    const fileStats = await stat(localPath);
    return new NextResponse(null, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(fileStats.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  }

  if (video.videoUrl) {
    const s3Key = extractS3KeyFromUrl(video.videoUrl);
    if (s3Key) {
      const signed = await generateSignedVideoUrl(s3Key);
      if (signed) return NextResponse.redirect(signed, 302);
    }
    if (isAllowedStoredRedirectUrl(video.videoUrl, request.url)) {
      return NextResponse.redirect(video.videoUrl, 302);
    }
    logger.warn("video_head_redirect_blocked", { jobId });
    return new NextResponse(null, { status: 502 });
  }

  if (video.renderStatus !== "ready") {
    return new NextResponse(null, { status: 409 });
  }

  return new NextResponse(null, { status: 404 });
}
