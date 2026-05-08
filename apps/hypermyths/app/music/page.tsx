"use client";

import "./music.css";

import {
  Link,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Upload,
} from "lucide-react";
import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useMusicEngine } from "@/lib/music/audio/music-engine-provider";
import type { YoutubeResolvedEntry } from "@/lib/youtube/shared";

const LOCAL_MP3_ACCEPT = "audio/mpeg,audio/mp3,.mp3";

function formatDuration(seconds: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function MusicPage() {
  const music = useMusicEngine();
  const [dropActive, setDropActive] = useState(false);

  if (!music) {
    return (
      <div className="mythx-page">
        <div className="mythx-controls">
          <div className="mythx-card">
            <div className="mythx-message">Music is starting.</div>
          </div>
        </div>
      </div>
    );
  }

  const player = music;
  const hasPlayableSource =
    player.sourceKind === "youtube"
      ? Boolean(player.youtubeState)
      : player.playlist.length > 0;
  const sourceLabel =
    player.sourceKind === "youtube" ? "YouTube audio" : "MP3 playlist";
  const message = player.playbackError ?? player.statusMessage;

  async function upload(file: File | null) {
    if (!file) return;
    await player.addUploadedFile(file);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void upload(event.target.files?.[0] ?? null);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDropActive(false);
    void upload(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleYoutubeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await player.loadYoutubeUrl(player.youtubeUrl);
  }

  async function playYoutubeEntry(entry: YoutubeResolvedEntry) {
    await player.playYoutubeEntry(entry);
  }

  return (
    <div className="mythx-page">
      <section className="mythx-music-shell" aria-labelledby="music-page-title">
        <div className="mythx-music-intro">
          <p className="mythx-panel-label">Audio-reactive studio</p>
          <h1 id="music-page-title">Music</h1>
          <p>
            Play local MP3 tracks or YouTube audio while the HyperMyths orb
            reacts across the whole app.
          </p>
        </div>

        <div className="mythx-controls">
          <div className="mythx-card">
            <div className="mythx-heading">
              <div>
                <h3>Music</h3>
                <p className="mythx-subtitle">
                  Play MP3s or YouTube through one player.
                </p>
              </div>
              {player.isPlaying ? (
                <span className="mythx-status-pill">LIVE</span>
              ) : null}
            </div>

          <section className="mythx-resolved-panel mythx-player-panel">
            <div className="mythx-now-playing">
              <div>
                <p className="mythx-panel-label">{sourceLabel}</p>
                <strong>{player.activeTitle}</strong>
              </div>
              <span>{player.isPlaying ? "Audio live" : "Paused"}</span>
            </div>

            <div
              className="mythx-transport"
              role="group"
              aria-label="Music transport controls"
            >
              <button
                type="button"
                className="mythx-transport-btn"
                onClick={() => void player.playByOffset(-1)}
                disabled={!hasPlayableSource}
                aria-label="Previous"
              >
                <SkipBack aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mythx-transport-btn mythx-transport-btn--primary"
                onClick={() => void player.togglePlayback()}
                disabled={!hasPlayableSource}
                aria-label={player.isPlaying ? "Pause" : "Play"}
              >
                {player.isPlaying ? (
                  <Pause aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="mythx-transport-btn"
                onClick={() => void player.playByOffset(1)}
                disabled={!hasPlayableSource}
                aria-label="Next"
              >
                <SkipForward aria-hidden="true" />
              </button>
            </div>
          </section>

          <div className="mythx-control-group">
            <label htmlFor="music-track-select">MP3 playlist</label>
            <select
              id="music-track-select"
              className="mythx-select"
              value={player.selectedTrackId}
              onChange={(event) => void player.playTrack(event.target.value)}
            >
              {player.playlist.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
          </div>

          <label
            className={`mythx-dropzone${dropActive ? " is-active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDropActive(false);
            }}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={LOCAL_MP3_ACCEPT}
              onChange={handleFileInput}
              className="sr-only"
            />
            <Upload aria-hidden="true" className="mythx-inline-icon" />
            <span className="mythx-dropzone-eyebrow">Local MP3</span>
            <strong>Drop or browse</strong>
          </label>

          <form className="mythx-youtube-form" onSubmit={handleYoutubeSubmit}>
            <label htmlFor="music-youtube-url">YouTube link</label>
            <div className="mythx-youtube-row">
              <input
                id="music-youtube-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={player.youtubeUrl}
                onChange={(event) => player.setYoutubeUrl(event.target.value)}
                className="mythx-input"
              />
              <button
                type="submit"
                className="mythx-primary-btn"
                disabled={player.youtubeLoading || !player.youtubeUrl.trim()}
              >
                <Link aria-hidden="true" className="mythx-inline-icon" />
                {player.youtubeLoading ? "Loading" : "Load"}
              </button>
            </div>
          </form>

          <div
            className={`mythx-message${player.playbackError ? " mythx-message--error" : ""}`}
          >
            {message}
          </div>

          {player.youtubeState ? (
            <section className="mythx-resolved-panel">
              <div className="mythx-resolved-copy">
                <p className="mythx-panel-label">
                  {player.youtubeState.kind === "playlist"
                    ? "YouTube playlist"
                    : "YouTube video"}
                </p>
                <strong>{player.youtubeState.title}</strong>
                <span>{player.youtubeState.uploader ?? "YouTube"}</span>
              </div>

              {player.youtubeState.kind === "playlist" ? (
                player.youtubeState.entries.length > 0 ? (
                  <div
                    className="mythx-playlist"
                    role="list"
                    aria-label="YouTube playlist"
                  >
                    {player.youtubeState.entries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`mythx-playlist-item${player.selectedYoutubeEntryId === entry.id ? " is-active" : ""}`}
                        onClick={() => void playYoutubeEntry(entry)}
                      >
                        <div>
                          <strong>{entry.title}</strong>
                          <span>
                            {formatDuration(entry.durationSeconds) ??
                              "Ready to play"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mythx-message">
                    Playlist loaded. Track details are unavailable.
                  </div>
                )
              ) : null}
            </section>
          ) : (
            <div className="mythx-message">
              Load a track to begin.
            </div>
          )}

          <div className="mythx-orb-note">
            Audio keeps playing across HyperMyths.
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
