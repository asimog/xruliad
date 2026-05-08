import { NextRequest, NextResponse } from "next/server";
import { isSafeUrl } from "@/lib/security/crypto";
import {
  resolveYoutubeMedia,
  YoutubeResolveError,
} from "@/lib/youtube/resolve";
import { isYouTubeUrl } from "@/lib/youtube/shared";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        { error: "Paste a YouTube video or playlist link." },
        { status: 400 },
      );
    }

    if (!isSafeUrl(url) || !isYouTubeUrl(url)) {
      return NextResponse.json(
        { error: "Only valid public YouTube URLs are allowed." },
        { status: 400 },
      );
    }

    const media = await resolveYoutubeMedia(url);
    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof YoutubeResolveError) {
      const status =
        error.code === "invalid_url"
          ? 400
          : error.code === "missing_binary"
            ? 503
            : 502;

      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "YouTube media could not be resolved right now." },
      { status: 500 },
    );
  }
}
