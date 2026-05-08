"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { EngineController } from "@/lib/music/core/engine";
import type { FrameSnapshot } from "@/lib/music/core/loop";
import type {
  YoutubeResolvedEntry,
  YoutubeResolvedMedia,
} from "@/lib/youtube/shared";

/**
 * Global Music Engine Context.
 *
 * The music engine lives HERE at the app root level, not on the music page.
 * This means:
 * - Music keeps playing when you navigate away from /music
 * - All pages have access to audio features for reactive backgrounds
 * - The music player UI only shows on /music page
 */

export type PlaylistTrack = {
  id: string;
  label: string;
  url: string;
  seed: string;
};

export type MusicSourceKind = "playlist" | "youtube";

type YouTubePlayer = {
  destroy: () => void;
  loadPlaylist: (
    playlist: string[] | string,
    index?: number,
    startSeconds?: number,
  ) => void;
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => { video_id?: string; title?: string } | undefined;
};

type YouTubeNamespace = {
  Player: new (
    element: Element | string,
    options: {
      width?: string;
      height?: string;
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YouTubePlayer;
};

interface MusicEngineContextType {
  controller: EngineController | null;
  frame: FrameSnapshot | null;
  isInitialized: boolean;
  playlist: PlaylistTrack[];
  selectedTrackId: string;
  selectedTrack: PlaylistTrack | null;
  sourceKind: MusicSourceKind;
  isPlaying: boolean;
  activeTitle: string;
  statusMessage: string;
  playbackError: string | null;
  youtubeUrl: string;
  youtubeState: YoutubeResolvedMedia | null;
  youtubeLoading: boolean;
  youtubePlayerReady: boolean;
  selectedYoutubeEntryId: string | null;
  initializeEngine: (canvas: HTMLCanvasElement) => void;
  setPlaylist: (tracks: PlaylistTrack[]) => void;
  setSelectedTrackId: (id: string) => void;
  addUploadedTrack: (track: PlaylistTrack) => void;
  setYoutubeUrl: (url: string) => void;
  playTrack: (trackId?: string) => Promise<void>;
  playByOffset: (offset: 1 | -1) => Promise<void>;
  togglePlayback: () => Promise<void>;
  loadYoutubeUrl: (url: string) => Promise<void>;
  playYoutubeEntry: (entry: YoutubeResolvedEntry) => Promise<void>;
  addUploadedFile: (file: File) => Promise<void>;
  setExternalAudioFeatures: (features: AudioFeatures | null) => void;
  disposeEngine: () => void;
  // Mic — persists across navigation
  isMicActive: boolean;
  micError: string | null;
  startMic: () => Promise<void>;
  stopMic: () => void;
  // Video audio — plays video file audio with analysis
  startVideoAudio: (objectUrl: string) => Promise<void>;
  stopVideoAudio: () => void;
}

const MusicEngineContext = createContext<MusicEngineContextType | null>(null);

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
    __hyperMythsYouTubeApiPromise?: Promise<YouTubeNamespace>;
  }
}

const YOUTUBE_PLAYING_STATE = 1;
const PLAYLIST_BASE_URL =
  process.env.NEXT_PUBLIC_MUSIC_PLAYLIST_BASE_URL?.trim() ?? "";
const DEFAULT_TRACK: PlaylistTrack = {
  id: "default-42069",
  label: "42069.mp3",
  url: "/music/42069.mp3",
  seed: "42069",
};

type PlaylistManifestTrack =
  | string
  | {
      file?: string;
      title?: string;
      url?: string;
      seed?: string;
    };

function prettifyName(name: string): string {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || name
  );
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("blob:");
}

function resolveTrackUrl(input: string): string {
  const trimmed = input.trim();
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^\/+/, "");
  if (PLAYLIST_BASE_URL) {
    return `${PLAYLIST_BASE_URL.replace(/\/+$/, "")}/${normalized}`;
  }
  return `/music/${normalized}`;
}

function isMp3File(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type === "audio/mpeg" || ext === "mp3";
}

async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getCurrentYoutubeVideoId(player: YouTubePlayer): string | null {
  try {
    return player.getVideoData()?.video_id ?? null;
  } catch {
    return null;
  }
}

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube playback requires a browser."));
  }

  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__hyperMythsYouTubeApiPromise) {
    return window.__hyperMythsYouTubeApiPromise;
  }

  window.__hyperMythsYouTubeApiPromise = new Promise<YouTubeNamespace>(
    (resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );

      window.onYouTubeIframeAPIReady = () => {
        if (window.YT?.Player) {
          resolve(window.YT);
          return;
        }
        reject(new Error("YouTube player API loaded without a player factory."));
      };

      if (existingScript) return;

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        reject(new Error("The YouTube player API could not be loaded."));
      };
      document.head.appendChild(script);
    },
  );

  return window.__hyperMythsYouTubeApiPromise;
}

export function useMusicEngine(): MusicEngineContextType | null {
  return useContext(MusicEngineContext);
}

/**
 * Audio Features Context — lightweight consumer for background reactivity.
 */

export interface AudioFeatures {
  bass: number;
  mid: number;
  high: number;
  volume: number;
  beat: boolean;
  isPlaying: boolean;
}

interface AudioFeaturesContextType {
  features: AudioFeatures;
}

const AudioFeaturesContext = createContext<AudioFeaturesContextType>({
  features: {
    bass: 0,
    mid: 0,
    high: 0,
    volume: 0,
    beat: false,
    isPlaying: false,
  },
});

export function useAudioFeatures(): AudioFeatures {
  return useContext(AudioFeaturesContext).features;
}

/**
 * Provider that wraps the app and manages the global music engine.
 */
export function MusicEngineProvider({ children }: { children: ReactNode }) {
  const [controller, setController] = useState<EngineController | null>(null);
  const [frame, setFrame] = useState<FrameSnapshot | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([DEFAULT_TRACK]);
  const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACK.id);
  const [sourceKind, setSourceKind] = useState<MusicSourceKind>("playlist");
  const [statusMessage, setStatusMessage] = useState("Ready.");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeState, setYoutubeState] = useState<YoutubeResolvedMedia | null>(
    null,
  );
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [selectedYoutubeEntryId, setSelectedYoutubeEntryId] = useState<
    string | null
  >(null);
  const engineRef = useRef<EngineController | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFramePushRef = useRef(0);
  const trackUrlRegistryRef = useRef<string[]>([]);
  const youtubeHostRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const youtubePollRef = useRef<number | null>(null);
  const youtubeBeatBucketRef = useRef(-1);
  const youtubePlayingRef = useRef(false);
  const selectedYoutubeEntryIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const initializationRunRef = useRef(0);
  const wantsPlaybackRef = useRef(false);
  const sourceKindRef = useRef<MusicSourceKind>("playlist");

  // Feature extraction for background reactivity
  const [features, setFeatures] = useState<AudioFeatures>({
    bass: 0,
    mid: 0,
    high: 0,
    volume: 0,
    beat: false,
    isPlaying: false,
  });
  const [externalAudioFeatures, setExternalAudioFeaturesState] =
    useState<AudioFeatures | null>(null);

  const smoothedRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });
  const lastBassRef = useRef(0);
  const beatThresholdRef = useRef(0);

  const selectedTrack = useMemo(
    () => playlist.find((track) => track.id === selectedTrackId) ?? null,
    [playlist, selectedTrackId],
  );

  const selectedTrackIndex = useMemo(
    () => playlist.findIndex((track) => track.id === selectedTrackId),
    [playlist, selectedTrackId],
  );

  const activeYoutubeEntry = useMemo(() => {
    if (!youtubeState) return null;
    return (
      youtubeState.entries.find(
        (entry) => entry.id === selectedYoutubeEntryId,
      ) ?? null
    );
  }, [selectedYoutubeEntryId, youtubeState]);

  const isLocalPlaying = (frame?.playing ?? false) && sourceKind === "playlist";
  const isPlaying = sourceKind === "youtube" ? youtubePlaying : isLocalPlaying;

  useEffect(() => {
    sourceKindRef.current = sourceKind;
  }, [sourceKind]);
  const activeTitle =
    sourceKind === "youtube"
      ? activeYoutubeEntry?.title ?? youtubeState?.title ?? "YouTube audio"
      : selectedTrack?.label ?? "No track loaded";

  useEffect(() => {
    selectedYoutubeEntryIdRef.current = selectedYoutubeEntryId;
  }, [selectedYoutubeEntryId]);

  // ─── Mic management (persists across navigation) ───────────────────────────
  const micContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micRafRef = useRef<number>(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(micRafRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    void micContextRef.current?.close();
    micContextRef.current = null;
    micStreamRef.current = null;
    if (!mountedRef.current) return;
    setIsMicActive(false);
    // Clear mic-sourced external features
    setExternalAudioFeaturesState((prev) =>
      prev?.isPlaying ? null : prev,
    );
  }, []);

  const startMic = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      micContextRef.current = ctx;
      micStreamRef.current = stream;

      const tick = () => {
        if (!mountedRef.current || micContextRef.current !== ctx) return;
        analyser.getByteFrequencyData(data);
        const n = data.length;
        const bassEnd = Math.max(1, Math.floor(n * 0.04));
        const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.20));
        const highEnd = Math.max(midEnd + 1, Math.floor(n * 0.60));
        let bassSum = 0; let midSum = 0; let highSum = 0; let total = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += data[i];
        for (let i = bassEnd; i < midEnd; i++) midSum += data[i];
        for (let i = midEnd; i < highEnd; i++) highSum += data[i];
        for (let i = 0; i < n; i++) total += data[i];
        const bass = Math.min(1, (bassSum / (bassEnd * 255)) * 2.5);
        const mid = Math.min(1, (midSum / ((midEnd - bassEnd) * 255)) * 2.0);
        const high = Math.min(1, (highSum / ((highEnd - midEnd) * 255)) * 2.0);
        const volume = Math.min(1, (total / (n * 255)) * 2.2);
        setExternalAudioFeaturesState({
          bass, mid, high, volume, beat: bass > 0.55, isPlaying: true,
        });
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close();
        return;
      }
      setIsMicActive(true);
    } catch (err) {
      if (!mountedRef.current) return;
      setMicError(
        err instanceof Error ? err.message : "Microphone access denied.",
      );
    }
  }, []);

  // ─── Video audio management (persists across navigation) ───────────────────
  const videoAudioCtxRef = useRef<AudioContext | null>(null);
  const videoAudioElRef = useRef<HTMLAudioElement | null>(null);
  const videoAudioRafRef = useRef<number>(0);

  const stopVideoAudio = useCallback(() => {
    cancelAnimationFrame(videoAudioRafRef.current);
    if (videoAudioElRef.current) {
      videoAudioElRef.current.pause();
      videoAudioElRef.current.src = "";
      videoAudioElRef.current = null;
    }
    void videoAudioCtxRef.current?.close();
    videoAudioCtxRef.current = null;
  }, []);

  const startVideoAudio = useCallback(
    async (objectUrl: string) => {
      stopVideoAudio();
      // Stop mic features while video is playing
      cancelAnimationFrame(micRafRef.current);

      const ctx = new AudioContext();
      const audioEl = new Audio(objectUrl);
      audioEl.loop = true;

      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      source.connect(ctx.destination); // audible playback

      const data = new Uint8Array(analyser.frequencyBinCount);
      videoAudioCtxRef.current = ctx;
      videoAudioElRef.current = audioEl;

      const tick = () => {
        if (!mountedRef.current || videoAudioElRef.current !== audioEl) return;
        analyser.getByteFrequencyData(data);
        const n = data.length;
        const bassEnd = Math.max(1, Math.floor(n * 0.04));
        const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.20));
        const highEnd = Math.max(midEnd + 1, Math.floor(n * 0.60));
        let bassSum = 0; let midSum = 0; let highSum = 0; let total = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += data[i];
        for (let i = bassEnd; i < midEnd; i++) midSum += data[i];
        for (let i = midEnd; i < highEnd; i++) highSum += data[i];
        for (let i = 0; i < n; i++) total += data[i];
        const bass = Math.min(1, (bassSum / (bassEnd * 255)) * 2.5);
        const mid = Math.min(1, (midSum / ((midEnd - bassEnd) * 255)) * 2.0);
        const high = Math.min(1, (highSum / ((highEnd - midEnd) * 255)) * 2.0);
        const volume = Math.min(1, (total / (n * 255)) * 2.2);
        setExternalAudioFeaturesState({
          bass, mid, high, volume, beat: bass > 0.55, isPlaying: true,
        });
        videoAudioRafRef.current = requestAnimationFrame(tick);
      };
      videoAudioRafRef.current = requestAnimationFrame(tick);

      await audioEl.play().catch(() => {
        // Autoplay blocked — audio will start on next user interaction
      });
    },
    [stopVideoAudio],
  );

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function loadPlaylistManifest() {
      try {
        const res = await fetch("/music/playlist.json", {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!res.ok) return;

        const data = (await res.json()) as { tracks?: PlaylistManifestTrack[] };
        const parsed = (data.tracks ?? [])
          .map((entry, idx): PlaylistTrack | null => {
            if (typeof entry === "string") {
              return {
                id: `manifest-${idx}`,
                label: prettifyName(entry),
                url: resolveTrackUrl(entry),
                seed: `manifest:${entry}`,
              };
            }

            const source = entry.url?.trim() || entry.file?.trim() || "";
            if (!source) return null;
            return {
              id: `manifest-${idx}`,
              label: entry.title?.trim() || prettifyName(source),
              url: resolveTrackUrl(source),
              seed: entry.seed?.trim() || `manifest:${source}`,
            };
          })
          .filter((track): track is PlaylistTrack => Boolean(track));

        if (!cancelled && !abortController.signal.aborted && parsed.length > 0) {
          setPlaylist([DEFAULT_TRACK, ...parsed]);
          setSelectedTrackId((current) => current || DEFAULT_TRACK.id);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // The built-in track stays available.
      }
    }

    void loadPlaylistManifest();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, []);

  const clearYoutubePoll = useCallback(() => {
    if (youtubePollRef.current) {
      window.clearInterval(youtubePollRef.current);
      youtubePollRef.current = null;
    }
  }, []);

  const setYoutubePlaybackState = useCallback((playing: boolean) => {
    if (youtubePlayingRef.current === playing) return;
    youtubePlayingRef.current = playing;
    if (!mountedRef.current) return;
    setYoutubePlaying(playing);
  }, []);

  const stopYoutubeFeatures = useCallback(() => {
    youtubeBeatBucketRef.current = -1;
    if (!mountedRef.current) {
      youtubePlayingRef.current = false;
      return;
    }
    setExternalAudioFeaturesState(null);
    setYoutubePlaybackState(false);
  }, [setYoutubePlaybackState]);

  const pauseYoutubeAudio = useCallback(() => {
    wantsPlaybackRef.current = false;
    youtubePlayerRef.current?.pauseVideo();
    clearYoutubePoll();
    stopYoutubeFeatures();
  }, [clearYoutubePoll, stopYoutubeFeatures]);

  const stopLocalPlayback = useCallback(() => {
    wantsPlaybackRef.current = false;
    engineRef.current?.pause();
  }, []);

  const stopOtherSources = useCallback(
    (keep: MusicSourceKind) => {
      if (keep !== "youtube") pauseYoutubeAudio();
      if (keep !== "playlist") stopLocalPlayback();
    },
    [pauseYoutubeAudio, stopLocalPlayback],
  );

  const syncYoutubeSelection = useCallback(
    (resource: YoutubeResolvedMedia | null, videoId: string | null) => {
      if (!resource || !videoId || resource.entries.length === 0) return;

      const nextEntry =
        resource.entries.find((entry) => entry.videoId === videoId) ?? null;
      if (!nextEntry || nextEntry.id === selectedYoutubeEntryIdRef.current) {
        return;
      }

      selectedYoutubeEntryIdRef.current = nextEntry.id;
      if (!mountedRef.current) return;
      setSelectedYoutubeEntryId(nextEntry.id);
    },
    [],
  );

  const updateSyntheticYoutubeFeatures = useCallback(
    (resource: YoutubeResolvedMedia | null) => {
      if (!mountedRef.current) return;
      const player = youtubePlayerRef.current;
      if (!player) {
        stopYoutubeFeatures();
        return;
      }

      let state = 0;
      try {
        state = player.getPlayerState();
      } catch {
        stopYoutubeFeatures();
        return;
      }
      const isYoutubePlaying = state === YOUTUBE_PLAYING_STATE;
      const currentVideoId = getCurrentYoutubeVideoId(player);
      syncYoutubeSelection(resource, currentVideoId);

      if (!isYoutubePlaying) {
        stopYoutubeFeatures();
        return;
      }

      setSourceKind("youtube");
      setYoutubePlaybackState(true);

      let time = 0;
      let duration = 1;
      try {
        time = Math.max(0, player.getCurrentTime() || 0);
        duration = Math.max(player.getDuration() || 0, 1);
      } catch {
        stopYoutubeFeatures();
        return;
      }
      const activeIndex =
        resource?.entries.findIndex((entry) => entry.videoId === currentVideoId) ??
        -1;
      const seed = activeIndex >= 0 ? activeIndex + 1 : 1;
      const progress = time / duration;
      const bass = clamp01(
        0.35 + 0.4 * Math.pow(0.5 + 0.5 * Math.sin(time * 2.2 + seed * 0.7), 2),
      );
      const mid = clamp01(
        0.22 + 0.38 * Math.pow(0.5 + 0.5 * Math.sin(time * 1.5 + seed * 1.1), 2),
      );
      const high = clamp01(
        0.18 +
          0.36 *
            Math.pow(
              0.5 + 0.5 * Math.sin(time * 3.8 + progress * Math.PI * 4 + seed),
              2,
            ),
      );
      const volume = clamp01(0.34 + bass * 0.26 + mid * 0.18 + high * 0.14);
      const beatBucket = Math.floor(time * (2.2 + seed * 0.05));
      const beat = beatBucket !== youtubeBeatBucketRef.current;
      youtubeBeatBucketRef.current = beatBucket;

      setExternalAudioFeaturesState({
        bass,
        mid,
        high,
        volume,
        beat,
        isPlaying: true,
      });
    },
    [stopYoutubeFeatures, syncYoutubeSelection, setYoutubePlaybackState],
  );

  const startYoutubeFeaturePoll = useCallback(
    (resource: YoutubeResolvedMedia) => {
      clearYoutubePoll();
      youtubePollRef.current = window.setInterval(() => {
        try {
          updateSyntheticYoutubeFeatures(resource);
        } catch {
          stopYoutubeFeatures();
        }
      }, 120);
    },
    [clearYoutubePoll, stopYoutubeFeatures, updateSyntheticYoutubeFeatures],
  );

  const ensureYoutubePlayer = useCallback(async () => {
    const host = youtubeHostRef.current;
    if (!host) {
      throw new Error("The YouTube player is still starting.");
    }

    if (youtubePlayerRef.current) return youtubePlayerRef.current;

    const api = await loadYouTubeIframeApi();
    const player = await new Promise<YouTubePlayer>((resolve, reject) => {
      const createdPlayer = new api.Player(host, {
        width: "1",
        height: "1",
        videoId: "",
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            if (!mountedRef.current) {
              createdPlayer.destroy();
              reject(new Error("YouTube player was closed before it was ready."));
              return;
            }
            setYoutubePlayerReady(true);
            resolve(createdPlayer);
          },
          onStateChange: (event) => {
            if (event.data !== YOUTUBE_PLAYING_STATE) {
              stopYoutubeFeatures();
            }
          },
          onError: () => {
            reject(new Error("YouTube playback failed to initialize."));
          },
        },
      });
    });

    youtubePlayerRef.current = player;
    return player;
  }, [stopYoutubeFeatures]);

  const playTrack = useCallback(
    async (trackId?: string) => {
      const activeController = engineRef.current;
      if (!activeController) {
        setStatusMessage("Audio engine is still starting.");
        return;
      }

      const targetId = trackId ?? selectedTrackId;
      const track =
        playlist.find((item) => item.id === targetId) ?? playlist[0] ?? null;
      if (!track) return;

      setPlaybackError(null);
      setSelectedTrackId(track.id);
      setSourceKind("playlist");
      stopOtherSources("playlist");
      wantsPlaybackRef.current = true;
      await activeController.resumeAudio();
      activeController.setTrackSeed(track.seed);
      await activeController.loadTrack(track.url);
      await activeController.play();
      setStatusMessage(`Playing ${track.label}.`);
    },
    [playlist, selectedTrackId, stopOtherSources],
  );

  const playByOffset = useCallback(
    async (offset: 1 | -1) => {
      if (sourceKind === "youtube") {
        if (offset === 1) youtubePlayerRef.current?.nextVideo();
        else youtubePlayerRef.current?.previousVideo();
        if (youtubeState) startYoutubeFeaturePoll(youtubeState);
        return;
      }

      if (playlist.length === 0) return;
      const baseIndex = selectedTrackIndex >= 0 ? selectedTrackIndex : 0;
      const nextIndex = (baseIndex + offset + playlist.length) % playlist.length;
      const track = playlist[nextIndex];
      await playTrack(track.id);
    },
    [
      playTrack,
      playlist,
      selectedTrackIndex,
      sourceKind,
      startYoutubeFeaturePoll,
      youtubeState,
    ],
  );

  const loadYoutubeMedia = useCallback(
    async (resource: YoutubeResolvedMedia, startIndex = 0) => {
      const player = await ensureYoutubePlayer();
      setPlaybackError(null);
      stopOtherSources("youtube");

      if (resource.kind === "playlist") {
        if (resource.entries.length > 0) {
          player.loadPlaylist(
            resource.entries.map((entry) => entry.videoId),
            startIndex,
            0,
          );
          const activeEntry = resource.entries[startIndex] ?? resource.entries[0];
          setSelectedYoutubeEntryId(activeEntry?.id ?? null);
          selectedYoutubeEntryIdRef.current = activeEntry?.id ?? null;
          setStatusMessage(`Streaming ${activeEntry?.title ?? resource.title}.`);
        } else if (resource.playlistId) {
          player.loadPlaylist(resource.playlistId, startIndex, 0);
          setSelectedYoutubeEntryId(null);
          selectedYoutubeEntryIdRef.current = null;
          setStatusMessage(`Streaming ${resource.title}.`);
        } else {
          throw new Error("This playlist does not include playable tracks.");
        }
      } else if (resource.videoId) {
        player.loadVideoById(resource.videoId);
        setSelectedYoutubeEntryId(resource.videoId);
        selectedYoutubeEntryIdRef.current = resource.videoId;
        setStatusMessage(`Streaming ${resource.title}.`);
      } else {
        throw new Error("This YouTube link does not include playable audio.");
      }

      setYoutubeState(resource);
      setSourceKind("youtube");
      wantsPlaybackRef.current = true;
      player.playVideo();
      setYoutubePlayerReady(true);
      setYoutubePlaybackState(true);
      startYoutubeFeaturePoll(resource);
      updateSyntheticYoutubeFeatures(resource);
    },
    [
      ensureYoutubePlayer,
      startYoutubeFeaturePoll,
      stopOtherSources,
      setYoutubePlaybackState,
      updateSyntheticYoutubeFeatures,
    ],
  );

  const loadYoutubeUrl = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) {
        setPlaybackError("Paste a YouTube link first.");
        return;
      }

      setYoutubeLoading(true);
      setPlaybackError(null);

      try {
        const response = await fetch("/api/youtube/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const payload = (await response.json()) as
          | YoutubeResolvedMedia
          | { error?: string };

        if (!response.ok || !("kind" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "YouTube media could not be resolved.",
          );
        }

        await loadYoutubeMedia(payload, 0);
        if (payload.warning) setPlaybackError(payload.warning);
      } catch (error) {
        stopYoutubeFeatures();
        setPlaybackError(
          error instanceof Error
            ? error.message
            : "YouTube media could not be resolved.",
        );
      } finally {
        setYoutubeLoading(false);
      }
    },
    [loadYoutubeMedia, stopYoutubeFeatures],
  );

  const playYoutubeEntry = useCallback(
    async (entry: YoutubeResolvedEntry) => {
      if (!youtubeState) return;
      const entryIndex = youtubeState.entries.findIndex(
        (candidate) => candidate.id === entry.id,
      );
      if (entryIndex < 0) return;
      await loadYoutubeMedia(youtubeState, entryIndex);
    },
    [loadYoutubeMedia, youtubeState],
  );

  const togglePlayback = useCallback(async () => {
    if (sourceKind === "youtube") {
      if (!youtubePlayerRef.current) return;
      if (youtubePlayingRef.current) {
        pauseYoutubeAudio();
        return;
      }
      stopOtherSources("youtube");
      wantsPlaybackRef.current = true;
      youtubePlayerRef.current.playVideo();
      if (youtubeState) {
        startYoutubeFeaturePoll(youtubeState);
        updateSyntheticYoutubeFeatures(youtubeState);
      }
      setYoutubePlaybackState(true);
      return;
    }

    const activeController = engineRef.current;
    if (!activeController) return;
    if (activeController.isPlaying()) {
      wantsPlaybackRef.current = false;
      activeController.pause();
      return;
    }
    await playTrack(selectedTrackId);
  }, [
    pauseYoutubeAudio,
    playTrack,
    selectedTrackId,
    setYoutubePlaybackState,
    sourceKind,
    startYoutubeFeaturePoll,
    stopOtherSources,
    updateSyntheticYoutubeFeatures,
    youtubeState,
  ]);

  const addUploadedFile = useCallback(
    async (file: File) => {
      if (!isMp3File(file)) {
        setPlaybackError("Use an MP3 file.");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const seed = await hashBytes(await file.arrayBuffer());
      const track: PlaylistTrack = {
        id: `upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        label: `Local: ${prettifyName(file.name)}`,
        url: objectUrl,
        seed,
      };

      trackUrlRegistryRef.current.push(objectUrl);
      setPlaylist((prev) => [...prev, track]);
      setSelectedTrackId(track.id);

      try {
        const activeController = engineRef.current;
        if (!activeController) {
          setStatusMessage("Audio engine is still starting.");
          return;
        }

        setPlaybackError(null);
        setSourceKind("playlist");
        stopOtherSources("playlist");
        wantsPlaybackRef.current = true;
        await activeController.resumeAudio();
        activeController.setTrackSeed(track.seed);
        await activeController.loadTrack(track.url);
        await activeController.play();
        setStatusMessage(`Playing ${track.label}.`);
      } catch (error) {
        setPlaybackError(
          error instanceof Error
            ? error.message
            : "MP3 loaded but playback did not start.",
        );
      }
    },
    [stopOtherSources],
  );

  const initializeEngine = useCallback((canvas: HTMLCanvasElement) => {
    if (engineRef.current) return; // Already initialized

    canvasRef.current = canvas;
    const initializationRun = (initializationRunRef.current += 1);

    // Dynamically import to avoid SSR issues
    import("@/lib/music/core/engine")
      .then(({ createEngine }) => {
        const ctrl = createEngine(canvas, (snapshot: FrameSnapshot) => {
          if (!mountedRef.current) return;
          // Throttle frame updates to ~12fps for UI
          const now = performance.now();
          if (now - lastFramePushRef.current >= 80) {
            lastFramePushRef.current = now;
            setFrame(snapshot);

            // Extract audio features with smoothing
            const audio = snapshot.audio;
            const smoothFactor = 0.15;
            const smoothed = smoothedRef.current;
            smoothed.bass =
              smoothed.bass * (1 - smoothFactor) + audio.bass * smoothFactor;
            smoothed.mid =
              smoothed.mid * (1 - smoothFactor) + audio.mid * smoothFactor;
            smoothed.high =
              smoothed.high * (1 - smoothFactor) + audio.high * smoothFactor;
            smoothed.volume =
              smoothed.volume * (1 - smoothFactor) + audio.volume * smoothFactor;

            // Beat detection
            const bassDelta = smoothed.bass - lastBassRef.current;
            const isBeat =
              bassDelta > beatThresholdRef.current && smoothed.bass > 0.3;
            beatThresholdRef.current =
              beatThresholdRef.current * 0.95 + bassDelta * 0.05;
            lastBassRef.current = smoothed.bass;

            setFeatures({
              bass: Math.min(1, smoothed.bass),
              mid: Math.min(1, smoothed.mid),
              high: Math.min(1, smoothed.high),
              volume: Math.min(1, smoothed.volume),
              beat: isBeat,
              isPlaying: snapshot.playing,
            });
          }
        });

        if (
          !mountedRef.current ||
          initializationRun !== initializationRunRef.current ||
          canvasRef.current !== canvas ||
          engineRef.current
        ) {
          ctrl.dispose();
          return;
        }

        engineRef.current = ctrl;
        setController(ctrl);
        setIsInitialized(true);
      })
      .catch((err) => {
        if (mountedRef.current) {
          console.error("Failed to initialize music engine:", err);
        }
      });
  }, []);

  const disposeEngine = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
      setController(null);
      setIsInitialized(false);
      setFrame(null);
      setFeatures({
        bass: 0,
        mid: 0,
        high: 0,
        volume: 0,
        beat: false,
        isPlaying: false,
      });
    }
  }, []);

  // Keep audio context alive - resume if suspended (more aggressive)
  useEffect(() => {
    if (!controller) return;

    const keepAlive = setInterval(async () => {
      try {
        await controller.resumeAudio();
        if (
          wantsPlaybackRef.current &&
          sourceKindRef.current === "playlist" &&
          document.visibilityState === "visible" &&
          !controller.isPlaying()
        ) {
          await controller.play();
        }
      } catch {
        // Ignore errors, just keep context alive
      }
    }, 2000); // Check every 2 seconds (more frequent)

    return () => clearInterval(keepAlive);
  }, [controller]);

  // Resume audio on any user interaction (browser policy requirement)
  useEffect(() => {
    const resumeOnInteraction = async () => {
      if (controller) {
        try {
          await controller.resumeAudio();
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("pointerdown", resumeOnInteraction, { once: true });
    window.addEventListener("keydown", resumeOnInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resumeOnInteraction);
      window.removeEventListener("keydown", resumeOnInteraction);
    };
  }, [controller]);

  // Track user intent to play, so we can restore playback when the browser
  // pauses the HTMLAudioElement (tab backgrounded, page hidden, bfcache restore,
  // OS suspend). resumeAudio() alone only wakes the AudioContext — it does not
  // restart a paused <audio> element.
  useEffect(() => {
    if (frame?.playing) wantsPlaybackRef.current = true;
  }, [frame?.playing]);

  useEffect(() => {
    if (!controller) return;

    const restore = async () => {
      try {
        await controller.resumeAudio();
        if (!wantsPlaybackRef.current) return;

        if (sourceKindRef.current === "playlist" && !controller.isPlaying()) {
          await controller.play();
          return;
        }

        if (
          sourceKindRef.current === "youtube" &&
          youtubePlayerRef.current &&
          !youtubePlayingRef.current
        ) {
          youtubePlayerRef.current.playVideo();
          if (youtubeState) {
            startYoutubeFeaturePoll(youtubeState);
            updateSyntheticYoutubeFeatures(youtubeState);
          }
        }
      } catch {
        // Autoplay may be blocked until next user gesture — ignore.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void restore();
    };
    const onPageShow = () => {
      void restore();
    };
    const onFocus = () => {
      void restore();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [controller, startYoutubeFeaturePoll, updateSyntheticYoutubeFeatures, youtubeState]);

  // Add uploaded track to global playlist
  const addUploadedTrack = useCallback((track: PlaylistTrack) => {
    trackUrlRegistryRef.current.push(track.url);
    setPlaylist((prev) => [...prev, track]);
    setSelectedTrackId(track.id);
  }, []);

  const setExternalAudioFeatures = useCallback(
    (next: AudioFeatures | null) => {
      setExternalAudioFeaturesState(next);
    },
    [],
  );

  const revokeTrackedObjectUrls = useCallback(() => {
    const urls = [...trackUrlRegistryRef.current];
    for (const url of urls) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
  }, []);

  // Cleanup browser resources when the root provider unmounts. The provider is
  // mounted above pages, so this does not run during normal route navigation.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      initializationRunRef.current += 1;
      window.clearInterval(youtubePollRef.current ?? 0);
      youtubePollRef.current = null;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      youtubePlayingRef.current = false;
      cancelAnimationFrame(micRafRef.current);
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      void micContextRef.current?.close();
      micContextRef.current = null;
      cancelAnimationFrame(videoAudioRafRef.current);
      videoAudioElRef.current?.pause();
      videoAudioElRef.current = null;
      void videoAudioCtxRef.current?.close();
      videoAudioCtxRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
      revokeTrackedObjectUrls();
    };
  }, [revokeTrackedObjectUrls]);

  const activeFeatures =
    externalAudioFeatures?.isPlaying ? externalAudioFeatures : features;

  return (
    <MusicEngineContext.Provider
      value={{
        controller,
        frame,
        isInitialized,
        playlist,
        selectedTrackId,
        selectedTrack,
        sourceKind,
        isPlaying,
        activeTitle,
        statusMessage,
        playbackError,
        youtubeUrl,
        youtubeState,
        youtubeLoading,
        youtubePlayerReady,
        selectedYoutubeEntryId,
        initializeEngine,
        setPlaylist,
        setSelectedTrackId,
        addUploadedTrack,
        setYoutubeUrl,
        playTrack,
        playByOffset,
        togglePlayback,
        loadYoutubeUrl,
        playYoutubeEntry,
        addUploadedFile,
        setExternalAudioFeatures,
        disposeEngine,
        isMicActive,
        micError,
        startMic,
        stopMic,
        startVideoAudio,
        stopVideoAudio,
      }}
    >
      <AudioFeaturesContext.Provider value={{ features: activeFeatures }}>
        <div
          ref={youtubeHostRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-9999px",
            top: "-9999px",
            width: 1,
            height: 1,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
        {children}
      </AudioFeaturesContext.Provider>
    </MusicEngineContext.Provider>
  );
}
