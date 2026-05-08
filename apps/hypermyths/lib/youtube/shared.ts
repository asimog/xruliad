export type YoutubeResolvedEntry = {
  id: string;
  title: string;
  videoId: string;
  watchUrl: string;
  embedUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export type YoutubeResolvedMedia = {
  kind: "video" | "playlist";
  sourceUrl: string;
  title: string;
  uploader: string | null;
  thumbnailUrl: string | null;
  embedUrl: string;
  videoId: string | null;
  playlistId: string | null;
  entries: YoutubeResolvedEntry[];
  resolvedWith: "youtube-dl" | "oembed";
  warning: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isYouTubeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(value: string): string | null {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") {
      return trimOrNull(segments[0]);
    }

    const queryId = trimOrNull(parsed.searchParams.get("v"));
    if (queryId) {
      return queryId;
    }

    if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
      return trimOrNull(segments[1]);
    }

    return null;
  } catch {
    return null;
  }
}

export function extractYouTubePlaylistId(value: string): string | null {
  try {
    const parsed = new URL(value);
    return trimOrNull(parsed.searchParams.get("list"));
  } catch {
    return null;
  }
}

export function buildYouTubeWatchUrl(
  videoId: string,
  playlistId?: string | null,
): string {
  const url = new URL(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
  if (playlistId) {
    url.searchParams.set("list", playlistId);
  }
  return url.toString();
}

export function buildYouTubeEmbedUrl(input: {
  videoId?: string | null;
  playlistId?: string | null;
  autoplay?: boolean;
}): string {
  const { videoId, playlistId, autoplay = true } = input;

  const baseUrl =
    videoId
      ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
      : "https://www.youtube.com/embed/videoseries";

  const url = new URL(baseUrl);
  if (playlistId) {
    url.searchParams.set("list", playlistId);
  }
  if (autoplay) {
    url.searchParams.set("autoplay", "1");
  }
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  return url.toString();
}

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}
