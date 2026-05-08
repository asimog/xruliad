import { describe, expect, it } from "vitest";
import {
  buildYouTubeEmbedUrl,
  extractYouTubePlaylistId,
  extractYouTubeVideoId,
  isYouTubeUrl,
} from "@/lib/youtube/shared";
import { normalizeYoutubeDlPayload } from "@/lib/youtube/resolve";

describe("youtube URL helpers", () => {
  it("recognizes common YouTube URL shapes", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
    expect(isYouTubeUrl("https://example.com/watch?v=abc123")).toBe(false);
  });

  it("extracts video and playlist ids", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=abc123&list=PL42"),
    ).toBe("abc123");
    expect(extractYouTubeVideoId("https://youtu.be/xyz789")).toBe("xyz789");
    expect(
      extractYouTubePlaylistId("https://www.youtube.com/watch?v=abc123&list=PL42"),
    ).toBe("PL42");
  });

  it("builds an autoplay embed URL", () => {
    expect(
      buildYouTubeEmbedUrl({ videoId: "abc123", playlistId: "PL42" }),
    ).toContain("/embed/abc123");
    expect(
      buildYouTubeEmbedUrl({ videoId: "abc123", playlistId: "PL42" }),
    ).toContain("list=PL42");
  });
});

describe("youtube-dl payload normalization", () => {
  it("normalizes a flat playlist payload into selectable entries", () => {
    const result = normalizeYoutubeDlPayload(
      "https://www.youtube.com/playlist?list=PL42",
      {
        _type: "playlist",
        id: "PL42",
        title: "Synthwave Set",
        uploader: "HyperMyths",
        entries: [
          {
            id: "video-1",
            title: "First Track",
            thumbnail: "https://img.example.com/1.jpg",
          },
          {
            id: "video-2",
            title: "Second Track",
          },
        ],
      },
    );

    expect(result.kind).toBe("playlist");
    expect(result.playlistId).toBe("PL42");
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].embedUrl).toContain("video-1");
    expect(result.entries[1].watchUrl).toContain("video-2");
  });

  it("keeps single videos lightweight", () => {
    const result = normalizeYoutubeDlPayload(
      "https://www.youtube.com/watch?v=solo-track",
      {
        id: "solo-track",
        title: "Solo Track",
        uploader: "Orb Radio",
      },
    );

    expect(result.kind).toBe("video");
    expect(result.videoId).toBe("solo-track");
    expect(result.entries).toHaveLength(0);
  });
});
