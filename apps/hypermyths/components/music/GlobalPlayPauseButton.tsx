"use client";

import { useCallback } from "react";
import {
  useAudioFeatures,
  useMusicEngine,
} from "@/lib/music/audio/music-engine-provider";

/**
 * Global Play/Pause Button
 * 
 * A simple button that controls the global music engine.
 * Shows on all pages, controls music playback.
 */

export function GlobalPlayPauseButton() {
  const music = useMusicEngine();
  const audio = useAudioFeatures();
  const isPlaying = music?.isPlaying ?? audio.isPlaying;
  const hasPlayableSource =
    music?.sourceKind === "youtube"
      ? Boolean(music.youtubeState)
      : Boolean(music?.playlist.length);

  const handleToggle = useCallback(async () => {
    if (!music || !hasPlayableSource) return;

    try {
      await music.togglePlayback();
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  }, [hasPlayableSource, music]);

  // Don't render if no music engine or playlist
  if (!music || !hasPlayableSource) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className="global-play-pause-btn"
      aria-label={isPlaying ? "Pause music" : "Play music"}
      title={isPlaying ? "Pause music" : "Play music"}
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "1.5rem",
        zIndex: 10000,
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        border: "2px solid rgba(39, 121, 167, 0.6)",
        background: isPlaying 
          ? "rgba(39, 121, 167, 0.25)" 
          : "rgba(39, 121, 167, 0.15)",
        backdropFilter: "blur(10px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
        boxShadow: isPlaying 
          ? "0 0 20px rgba(39, 121, 167, 0.4)" 
          : "0 0 10px rgba(39, 121, 167, 0.2)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(39, 121, 167, 0.35)";
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isPlaying 
          ? "rgba(39, 121, 167, 0.25)" 
          : "rgba(39, 121, 167, 0.15)";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isPlaying ? (
        // Pause icon (two vertical bars)
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="5" y="4" width="3" height="12" rx="1" fill="var(--blue)" />
          <rect x="12" y="4" width="3" height="12" rx="1" fill="var(--blue)" />
        </svg>
      ) : (
        // Play icon (triangle)
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6 4L16 10L6 16V4Z" fill="var(--blue)" />
        </svg>
      )}
    </button>
  );
}
