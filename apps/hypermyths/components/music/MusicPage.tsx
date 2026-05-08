"use client";

import { MusicUI } from "@/components/music/MusicUI";
import { useMusicEngine } from "@/lib/music/audio/music-engine-provider";

/**
 * Music Page - Only shows the MusicUI player controls.
 * The music engine is initialized globally by GlobalMusicInitializer.
 * This page just provides the UI for controlling playback.
 */

export function MusicPageRoot() {
  const musicEngine = useMusicEngine();
  const controller = musicEngine?.controller ?? null;
  const frame = musicEngine?.frame ?? null;

  return (
    <div className="music-page">
      {/* Music UI - only visible on /music page */}
      <MusicUI controller={controller} frame={frame} />
    </div>
  );
}
