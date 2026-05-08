import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  extractYouTubePlaylistId,
  extractYouTubeVideoId,
  isYouTubeUrl,
  type YoutubeResolvedEntry,
  type YoutubeResolvedMedia,
} from "@/lib/youtube/shared";

const execFileAsync = promisify(execFile);

type YoutubeDlEntry = {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  thumbnail?: string;
  duration?: number;
};

type YoutubeDlPayload = YoutubeDlEntry & {
  _type?: string;
  uploader?: string;
  channel?: string;
  entries?: YoutubeDlEntry[];
};

type YoutubeRunner = {
  command: string;
  baseArgs: string[];
};

const YOUTUBE_RUNNERS: YoutubeRunner[] = [
  process.env.YOUTUBE_DL_BINARY?.trim()
    ? {
        command: process.env.YOUTUBE_DL_BINARY.trim(),
        baseArgs: [],
      }
    : null,
  { command: "youtube-dl", baseArgs: [] },
  { command: "yt-dlp", baseArgs: [] },
  { command: "python3", baseArgs: ["-m", "youtube_dl"] },
  { command: "python", baseArgs: ["-m", "youtube_dl"] },
].filter((value): value is YoutubeRunner => Boolean(value));

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export class YoutubeResolveError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_url" | "missing_binary" | "resolve_failed",
  ) {
    super(message);
    this.name = "YoutubeResolveError";
  }
}

function normalizeEntry(
  entry: YoutubeDlEntry,
  playlistId: string | null,
  index: number,
): YoutubeResolvedEntry | null {
  const videoId =
    trimOrNull(entry.id) ??
    (entry.url ? extractYouTubeVideoId(entry.url) : null) ??
    (entry.webpage_url ? extractYouTubeVideoId(entry.webpage_url) : null);

  if (!videoId) {
    return null;
  }

  return {
    id: `${videoId}-${index}`,
    title: trimOrNull(entry.title) ?? `Video ${index + 1}`,
    videoId,
    watchUrl:
      trimOrNull(entry.webpage_url) ??
      trimOrNull(entry.url) ??
      buildYouTubeWatchUrl(videoId, playlistId),
    embedUrl: buildYouTubeEmbedUrl({ videoId, playlistId }),
    thumbnailUrl: trimOrNull(entry.thumbnail) ?? buildYouTubeThumbnailUrl(videoId),
    durationSeconds:
      typeof entry.duration === "number" && Number.isFinite(entry.duration)
        ? entry.duration
        : null,
  };
}

export function normalizeYoutubeDlPayload(
  sourceUrl: string,
  payload: YoutubeDlPayload,
): YoutubeResolvedMedia {
  const sourceVideoId = extractYouTubeVideoId(sourceUrl);
  const sourcePlaylistId = extractYouTubePlaylistId(sourceUrl);
  const playlistId =
    payload._type === "playlist"
      ? trimOrNull(payload.id) ?? sourcePlaylistId
      : sourcePlaylistId;

  const entries = (payload.entries ?? [])
    .map((entry, index) => normalizeEntry(entry, playlistId, index))
    .filter((entry): entry is YoutubeResolvedEntry => Boolean(entry));

  const payloadVideoId =
    trimOrNull(payload.id) ??
    (payload.webpage_url ? extractYouTubeVideoId(payload.webpage_url) : null) ??
    (payload.url ? extractYouTubeVideoId(payload.url) : null);

  const activeVideoId =
    entries[0]?.videoId ?? payloadVideoId ?? sourceVideoId ?? null;

  const kind =
    payload._type === "playlist" || entries.length > 0 || Boolean(playlistId && !activeVideoId)
      ? "playlist"
      : "video";

  return {
    kind,
    sourceUrl,
    title:
      trimOrNull(payload.title) ??
      (kind === "playlist" ? "YouTube playlist" : "YouTube video"),
    uploader: trimOrNull(payload.uploader) ?? trimOrNull(payload.channel),
    thumbnailUrl:
      trimOrNull(payload.thumbnail) ??
      entries[0]?.thumbnailUrl ??
      (activeVideoId ? buildYouTubeThumbnailUrl(activeVideoId) : null),
    embedUrl: buildYouTubeEmbedUrl({
      videoId: activeVideoId,
      playlistId: kind === "playlist" ? playlistId : null,
    }),
    videoId: activeVideoId,
    playlistId,
    entries,
    resolvedWith: "youtube-dl",
    warning: null,
  };
}

async function fetchYoutubeDlPayload(url: string): Promise<YoutubeDlPayload> {
  let sawMissingBinary = false;
  let lastErrorMessage = "youtube-dl could not resolve this URL.";

  for (const runner of YOUTUBE_RUNNERS) {
    try {
      const { stdout } = await execFileAsync(
        runner.command,
        [
          ...runner.baseArgs,
          "--dump-single-json",
          "--flat-playlist",
          "--skip-download",
          "--no-warnings",
          "--playlist-end",
          "25",
          url,
        ],
        {
          timeout: 20_000,
          maxBuffer: 4 * 1024 * 1024,
        },
      );

      return JSON.parse(stdout) as YoutubeDlPayload;
    } catch (error) {
      const maybeError = error as {
        code?: string | number;
        stderr?: string;
        stdout?: string;
        message?: string;
      };

      const stderr = maybeError.stderr?.trim() ?? "";
      const stdout = maybeError.stdout?.trim() ?? "";

      if (
        maybeError.code === "ENOENT" ||
        /No module named youtube_dl/i.test(stderr) ||
        /No module named youtube_dl/i.test(stdout)
      ) {
        sawMissingBinary = true;
        continue;
      }

      if (stdout) {
        try {
          return JSON.parse(stdout) as YoutubeDlPayload;
        } catch {
          // Keep the richer stderr below if JSON parsing fails.
        }
      }

      lastErrorMessage = stderr || maybeError.message || lastErrorMessage;
    }
  }

  if (sawMissingBinary) {
    throw new YoutubeResolveError(
      "Install youtube-dl, yt-dlp, or set YOUTUBE_DL_BINARY to enable playlist extraction.",
      "missing_binary",
    );
  }

  throw new YoutubeResolveError(lastErrorMessage, "resolve_failed");
}

async function fetchYouTubeOEmbed(url: string): Promise<{
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
}> {
  try {
    const endpoint =
      "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url);
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        title: null,
        authorName: null,
        thumbnailUrl: null,
      };
    }

    const payload = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    return {
      title: trimOrNull(payload.title),
      authorName: trimOrNull(payload.author_name),
      thumbnailUrl: trimOrNull(payload.thumbnail_url),
    };
  } catch {
    return {
      title: null,
      authorName: null,
      thumbnailUrl: null,
    };
  }
}

async function resolveYoutubeFallback(url: string): Promise<YoutubeResolvedMedia> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new YoutubeResolveError(
      "A playable video ID could not be extracted from this YouTube URL.",
      "resolve_failed",
    );
  }

  const playlistId = extractYouTubePlaylistId(url);
  const oembed = await fetchYouTubeOEmbed(url);

  return {
    kind: "video",
    sourceUrl: url,
    title: oembed.title ?? "YouTube video",
    uploader: oembed.authorName,
    thumbnailUrl: oembed.thumbnailUrl ?? buildYouTubeThumbnailUrl(videoId),
    embedUrl: buildYouTubeEmbedUrl({ videoId, playlistId }),
    videoId,
    playlistId,
    entries: [],
    resolvedWith: "oembed",
    // Only surface a warning when the user loses functionality (playlist entries).
    // For a single video, oEmbed already provides title/thumbnail/uploader and the
    // embed URL plays fine — there is nothing the user needs to act on.
    warning: playlistId
      ? "Playlist entries are unavailable until youtube-dl or yt-dlp is installed on the server."
      : null,
  };
}

export async function resolveYoutubeMedia(url: string): Promise<YoutubeResolvedMedia> {
  const trimmed = url.trim();

  if (!isYouTubeUrl(trimmed)) {
    throw new YoutubeResolveError(
      "Paste a valid YouTube video or playlist URL.",
      "invalid_url",
    );
  }

  try {
    const payload = await fetchYoutubeDlPayload(trimmed);
    return normalizeYoutubeDlPayload(trimmed, payload);
  } catch (error) {
    if (
      error instanceof YoutubeResolveError &&
      error.code === "missing_binary"
    ) {
      return resolveYoutubeFallback(trimmed);
    }
    throw error;
  }
}
