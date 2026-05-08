"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import { TrackControls } from "@/components/music/TrackControls";
import { UploadPanel } from "@/components/music/UploadPanel";
import { WinampMiniPlayer } from "@/components/music/WinampMiniPlayer";
import { useMusicEngine } from "@/lib/music/audio/music-engine-provider";
import type { EngineController } from "@/lib/music/core/engine";
import type { FrameSnapshot } from "@/lib/music/core/loop";
import {
  normalizeSimulationEntry,
  type SimulationEntry,
} from "@/lib/music/generative/simulation-library";

type MusicUIProps = {
  controller: EngineController | null;
  frame: FrameSnapshot | null;
};

type PlaylistTrack = {
  id: string;
  label: string;
  url: string;
  seed: string;
};

type PlaylistManifestTrack =
  | string
  | {
      file?: string;
      title?: string;
      url?: string;
      seed?: string;
    };

type SimManifest = {
  simulations?: Partial<SimulationEntry>[];
};

const PLAYLIST_BASE_URL =
  process.env.NEXT_PUBLIC_MUSIC_PLAYLIST_BASE_URL?.trim() ?? "";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function prettifyName(name: string): string {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("blob:");
}

function resolveTrackUrl(input: string): string {
  const trimmed = input.trim();
  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.replace(/^\/+/, "");
  if (PLAYLIST_BASE_URL) {
    return `${PLAYLIST_BASE_URL.replace(/\/+$/, "")}/${normalized}`;
  }
  return `/music/${normalized}`;
}

async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function createDemoWavUrl(mode: "pulse" | "drone"): string {
  const sampleRate = 44100;
  const durationSec = mode === "pulse" ? 9 : 12;
  const frames = sampleRate * durationSec;
  const data = new Int16Array(frames);

  for (let i = 0; i < frames; i += 1) {
    const t = i / sampleRate;
    const base = mode === "pulse" ? 90 : 130;
    const mod =
      mode === "pulse"
        ? Math.sin(t * 2 * Math.PI * 2) * 30
        : Math.sin(t * 2 * Math.PI * 0.25) * 8;
    const hz = base + mod;
    const wave = Math.sin(t * 2 * Math.PI * hz);
    const env =
      mode === "pulse"
        ? Math.max(0.1, (Math.sin(t * Math.PI * 2) + 1) * 0.5)
        : 0.6;

    data[i] = Math.max(-1, Math.min(1, wave * env)) * 32767;
  }

  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = data.length * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < data.length; i += 1) {
    view.setInt16(offset, data[i], true);
    offset += bytesPerSample;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export function MusicUI({ controller, frame }: MusicUIProps) {
  const musicEngine = useMusicEngine();
  const globalPlaylist = musicEngine?.playlist ?? [];
  const globalSelectedTrackId = musicEngine?.selectedTrackId ?? "";
  const setGlobalPlaylist = musicEngine?.setPlaylist ?? (() => {});
  const setGlobalSelectedTrackId =
    musicEngine?.setSelectedTrackId ?? (() => {});
  const addGlobalUploadedTrack = musicEngine?.addUploadedTrack ?? (() => {});

  const [simulations, setSimulations] = useState<SimulationEntry[]>([]);
  const [simulation, setSimulation] = useState<SimulationEntry | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [localPlaylistInitialized, setLocalPlaylistInitialized] =
    useState(false);

  const playing = frame?.playing ?? false;

  // Use global playlist, but initialize it once
  const playlist = globalPlaylist;
  const selectedTrackId = globalSelectedTrackId;

  useEffect(() => {
    if (!controller) return;

    const abortController = new AbortController();
    const loadSims = async () => {
      // Guard against late execution after abort
      if (abortController.signal.aborted) return;

      let sims = controller.getSimulations();
      try {
        const res = await fetch("/music/simulations.json", {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as SimManifest;
          const external = (data.simulations ?? []).map((item, index) =>
            normalizeSimulationEntry(item, index),
          );
          sims = controller.setSimulationLibrary(external);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        // Keep built-in simulations.
      }

      if (!abortController.signal.aborted) {
        setSimulations(sims);
        if (sims.length > 0) {
          setSimulation(controller.setSimulation(sims[0].id));
        }
      }
    };

    void loadSims();

    return () => {
      abortController.abort();
    };
  }, [controller]);

  // Initialize playlist ONCE globally (doesn't reset on navigation)
  useEffect(() => {
    if (!controller || localPlaylistInitialized) return;
    setLocalPlaylistInitialized(true);

    const demoPulse = createDemoWavUrl("pulse");
    const demoDrone = createDemoWavUrl("drone");

    // Default track: 42069.mp3
    const defaultTrack: PlaylistTrack = {
      id: "default-42069",
      label: "42069.mp3",
      url: "/music/42069.mp3",
      seed: "42069",
    };

    const fallback: PlaylistTrack[] = [
      defaultTrack,
      {
        id: "demo-pulse",
        label: "Library: Pulse Loop",
        url: demoPulse,
        seed: "demo-pulse",
      },
      {
        id: "demo-drone",
        label: "Library: Drone Texture",
        url: demoDrone,
        seed: "demo-drone",
      },
    ];

    const abortController = new AbortController();
    const loadManifest = async () => {
      if (abortController.signal.aborted) return;

      try {
        const res = await fetch("/music/playlist.json", {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!res.ok) {
          if (!abortController.signal.aborted) {
            setGlobalPlaylist(fallback);
            setGlobalSelectedTrackId(defaultTrack.id);
          }
          return;
        }

        const data = (await res.json()) as { tracks?: PlaylistManifestTrack[] };
        const parsed = (data.tracks ?? [])
          .map((entry, idx): PlaylistTrack | null => {
            if (typeof entry === "string") {
              const label = prettifyName(entry);
              const url = resolveTrackUrl(entry);
              return {
                id: `manifest-${idx}`,
                label,
                url,
                seed: `manifest:${entry}`,
              };
            }

            const source = entry.url?.trim() || entry.file?.trim() || "";
            if (!source) return null;
            const label = entry.title?.trim() || prettifyName(source);
            const url = resolveTrackUrl(source);
            return {
              id: `manifest-${idx}`,
              label,
              url,
              seed: entry.seed?.trim() || `manifest:${source}`,
            };
          })
          .filter((track): track is PlaylistTrack => Boolean(track));

        // Prepend default track to playlist
        const next = parsed.length > 0 ? [defaultTrack, ...parsed] : fallback;
        if (!abortController.signal.aborted) {
          setGlobalPlaylist(next);
          setGlobalSelectedTrackId(defaultTrack.id);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (!abortController.signal.aborted) {
          setGlobalPlaylist(fallback);
          setGlobalSelectedTrackId(defaultTrack.id);
        }
      }
    };

    void loadManifest();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, localPlaylistInitialized]);

  const currentIndex = useMemo(
    () => playlist.findIndex((track) => track.id === selectedTrackId),
    [playlist, selectedTrackId],
  );

  const currentTrack = currentIndex >= 0 ? playlist[currentIndex] : null;

  const playTrack = useCallback(
    async (track: PlaylistTrack, autoPlay = true) => {
      if (!controller) return;
      setAudioError(null);
      try {
        await controller.resumeAudio();
        if (simulations.length > 0) {
          const nextSimulation = controller.stepSimulation(1);
          setSimulation(nextSimulation);
        }
        controller.setTrackSeed(track.seed);
        await controller.loadTrack(track.url);
        if (autoPlay) {
          await controller.play();
        }
      } catch (error) {
        setAudioError(
          error instanceof Error ? error.message : "Failed to start playback.",
        );
      }
    },
    [controller, simulations.length],
  );

  // DO NOT preload track - this stops currently playing music when navigating to /music
  // Just resume audio context on first user interaction
  useEffect(() => {
    if (!controller) return;

    const unlock = () => {
      void controller.resumeAudio().catch(() => {
        // User may still need to press play depending on browser policy.
      });
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [controller]);

  const playByIndex = async (index: number) => {
    if (playlist.length === 0) return;
    const nextIndex = (index + playlist.length) % playlist.length;
    const track = playlist[nextIndex];
    setGlobalSelectedTrackId(track.id);
    await playTrack(track, true);
  };

  const onSelectTrack = async (value: string) => {
    const track = playlist.find((item) => item.id === value);
    if (!track) return;
    setGlobalSelectedTrackId(value);
    await playTrack(track, true);
  };

  const addUploadedTrack = async (file: File) => {
    const url = URL.createObjectURL(file);

    const seed = await hashBytes(await file.arrayBuffer());
    const track: PlaylistTrack = {
      id: `upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label: `Local: ${prettifyName(file.name)}`,
      url,
      seed,
    };

    addGlobalUploadedTrack(track);

    if (!controller) return;
    await playTrack(track, true);
  };

  const onDropLocalFile = async (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const typeLooksAudio = file.type.includes("audio");
    const extLooksAudio = ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(
      ext,
    );
    if (!typeLooksAudio && !extLooksAudio) return;
    await addUploadedTrack(file);
  };

  const onTogglePlayback = async () => {
    if (!controller) return;
    setAudioError(null);
    try {
      await controller.togglePlayback();
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : "Playback failed to start.",
      );
    }
  };

  const stepSimulation = (direction: 1 | -1) => {
    if (!controller) return;
    const next = controller.stepSimulation(direction);
    setSimulation(next);
  };

  const onRandomizeVisuals = () => {
    if (!controller) return;
    const next = controller.randomizeExperience();
    setSimulation(next.simulation);
  };

  return (
    <section
      className="music-ui"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => void onDropLocalFile(e)}
    >
      <div className="music-card">
        <p className="music-eyebrow">AUDIO REACTIVE</p>
        <h1>Music Engine</h1>
        <p className="music-subcopy">
          Drop MP3 files here or add `/public/music/playlist.json` for your
          42-track local set.
        </p>
        {audioError && <p className="music-audio-error">{audioError}</p>}
        <WinampMiniPlayer
          title={currentTrack?.label ?? "No Track Loaded"}
          playing={playing}
          onPrev={() => {
            void playByIndex(
              currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1,
            );
          }}
          onNext={() => {
            void playByIndex(currentIndex + 1);
          }}
          onSeekBack={() => controller?.seekBy(-10)}
          onSeekForward={() => controller?.seekBy(10)}
          onTogglePlayback={() => {
            void onTogglePlayback();
          }}
          onRandomize={onRandomizeVisuals}
        />

        <div className="sim-panel">
          <button
            type="button"
            onClick={() => stepSimulation(-1)}
            disabled={!controller || simulations.length === 0}
          >
            ←
          </button>
          <div className="sim-panel-copy">
            <strong>{simulation?.name ?? "Simulation"}</strong>
            <p>{simulation?.physics ?? "Physics summary unavailable."}</p>
          </div>
          <button
            type="button"
            onClick={() => stepSimulation(1)}
            disabled={!controller || simulations.length === 0}
          >
            →
          </button>
        </div>
        <button
          type="button"
          className="music-btn music-btn-random-scene"
          onClick={onRandomizeVisuals}
          disabled={!controller}
        >
          ⚄ Randomizer
        </button>

        <TrackControls
          tracks={playlist.map((track) => ({
            label: track.label,
            value: track.id,
          }))}
          selectedTrack={selectedTrackId}
          onSelectTrack={(value) => {
            void onSelectTrack(value);
          }}
        />

        <UploadPanel
          onLoad={(file) => {
            void addUploadedTrack(file);
          }}
        />

        <div className="music-stats">
          <div>Bass: {(frame?.audio.bass ?? 0).toFixed(2)}</div>
          <div>Mid: {(frame?.audio.mid ?? 0).toFixed(2)}</div>
          <div>High: {(frame?.audio.high ?? 0).toFixed(2)}</div>
          <div>Volume: {(frame?.audio.volume ?? 0).toFixed(2)}</div>
          <div>BPM: {frame?.bpm ?? 0}</div>
          <div>Systems: {frame?.systems ?? 0}</div>
          <div>Chaos: {(frame?.chaos ?? 0).toFixed(2)}</div>
          <div>Spawn: {(frame?.spawnRate ?? 0).toFixed(3)}</div>
          <div>Beat: {frame?.beat ? "Yes" : "No"}</div>
          <div>Onset: {frame?.onset ? "Yes" : "No"}</div>
          <div>
            Time: {formatTime(frame?.currentTime ?? 0)} /{" "}
            {formatTime(frame?.duration ?? 0)}
          </div>
        </div>
      </div>
      <aside className="music-sim-info">
        <p className="music-sim-info-eyebrow">SIMULATION PROFILE</p>
        <h3>{simulation?.name ?? "Unknown Simulation"}</h3>
        <p>{simulation?.description ?? "No simulation selected."}</p>
        <div className="music-sim-info-grid">
          <div>
            <span>Family</span>
            <strong>{simulation?.motionFamily ?? "n/a"}</strong>
          </div>
          <div>
            <span>Physics</span>
            <strong>{simulation?.physics ?? "n/a"}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong>{simulation?.sourceFile ?? "built-in"}</strong>
          </div>
          <div>
            <span>Audio Reactivity</span>
            <strong>
              B {Math.round((frame?.audio.bass ?? 0) * 100)} / M{" "}
              {Math.round((frame?.audio.mid ?? 0) * 100)} / H{" "}
              {Math.round((frame?.audio.high ?? 0) * 100)}
            </strong>
          </div>
        </div>
      </aside>
    </section>
  );
}
