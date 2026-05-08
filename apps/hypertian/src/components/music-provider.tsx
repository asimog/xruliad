'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type MusicTrack = {
  id: string;
  label: string;
  url: string;
  seed: string;
};

export type AudioFeatures = {
  bass: number;
  mid: number;
  high: number;
  volume: number;
  beat: boolean;
  isPlaying: boolean;
};

type SourceKind = 'playlist' | 'youtube';

type YouTubePlayer = {
  loadPlaylist: (playlist: string[] | string, index?: number, startSeconds?: number) => void;
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type YouTubeNamespace = {
  Player: new (
    element: Element,
    options: {
      width?: string;
      height?: string;
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (event: { data: number }) => void };
    },
  ) => YouTubePlayer;
};

type MusicContextValue = {
  tracks: MusicTrack[];
  selectedTrackId: string;
  selectedTrack: MusicTrack | null;
  sourceKind: SourceKind;
  isPlaying: boolean;
  status: string;
  error: string | null;
  features: AudioFeatures;
  setSelectedTrackId: (id: string) => void;
  playTrack: (id?: string) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  addUploadedTrack: (file: File) => Promise<void>;
  loadYouTube: (url: string) => Promise<void>;
  youtubeNext: () => void;
  youtubePrevious: () => void;
};

const DEFAULT_TRACK: MusicTrack = {
  id: 'default-42069',
  label: '42069.mp3',
  url: '/music/42069.mp3',
  seed: '42069',
};

const emptyFeatures: AudioFeatures = {
  bass: 0,
  mid: 0,
  high: 0,
  volume: 0,
  beat: false,
  isPlaying: false,
};

const MusicContext = createContext<MusicContextValue | null>(null);

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
    __hypertianYouTubeApiPromise?: Promise<YouTubeNamespace>;
  }
}

function prettifyName(name: string) {
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || name;
}

function resolveTrackUrl(input: string) {
  if (/^https?:\/\//i.test(input) || input.startsWith('blob:')) return input;
  return `/music/${input.replace(/^\/+/, '')}`;
}

async function hashFile(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

function parseYouTubeUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'youtube.com' && !host.endsWith('.youtube.com') && host !== 'youtu.be') {
    throw new Error('Paste a valid YouTube video or playlist URL.');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const videoId = host === 'youtu.be' ? parts[0] : url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null);
  const playlistId = url.searchParams.get('list');
  if (!videoId && !playlistId) {
    throw new Error('That YouTube URL does not include a video or playlist ID.');
  }
  return { videoId, playlistId };
}

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__hypertianYouTubeApiPromise) return window.__hypertianYouTubeApiPromise;

  window.__hypertianYouTubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player API loaded without a player.'));
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('YouTube player API could not be loaded.'));
    document.head.appendChild(script);
  });

  return window.__hypertianYouTubeApiPromise;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const youtubePollRef = useRef<number>(0);
  const beatBucketRef = useRef(-1);
  const objectUrlsRef = useRef<string[]>([]);

  const [tracks, setTracks] = useState<MusicTrack[]>([DEFAULT_TRACK]);
  const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACK.id);
  const [sourceKind, setSourceKind] = useState<SourceKind>('playlist');
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Ready.');
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<AudioFeatures>(emptyFeatures);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, tracks],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadManifest() {
      try {
        const res = await fetch('/music/playlist.json', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { tracks?: Array<string | { file?: string; url?: string; title?: string; seed?: string }> };
        const parsed = (json.tracks ?? []).map((entry, index): MusicTrack | null => {
          const source = typeof entry === 'string' ? entry : entry.url || entry.file || '';
          if (!source) return null;
          return {
            id: `manifest-${index}`,
            label: typeof entry === 'string' ? prettifyName(source) : entry.title || prettifyName(source),
            url: resolveTrackUrl(source),
            seed: typeof entry === 'string' ? source : entry.seed || source,
          };
        }).filter((track): track is MusicTrack => Boolean(track));
        if (!cancelled && parsed.length) {
          setTracks([DEFAULT_TRACK, ...parsed]);
        }
      } catch {
        // Built-in track stays available.
      }
    }
    void loadManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearInterval(youtubePollRef.current);
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      void ctxRef.current?.close();
    };
  }, []);

  const ensureAudio = useCallback(async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      sourceRef.current = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    return audioRef.current;
  }, []);

  const stopYouTube = useCallback(() => {
    playerRef.current?.pauseVideo();
    window.clearInterval(youtubePollRef.current);
    beatBucketRef.current = -1;
  }, []);

  const startAnalyserLoop = useCallback(() => {
    const data = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 0);
    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser || !data.length) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      analyser.getByteFrequencyData(data);
      const n = data.length;
      const bassEnd = Math.max(1, Math.floor(n * 0.08));
      const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.32));
      let bass = 0;
      let mid = 0;
      let high = 0;
      let total = 0;
      for (let i = 0; i < n; i += 1) {
        const value = data[i] / 255;
        total += value;
        if (i < bassEnd) bass += value;
        else if (i < midEnd) mid += value;
        else high += value;
      }
      const nextBass = Math.min(1, (bass / bassEnd) * 1.7);
      const nextMid = Math.min(1, (mid / (midEnd - bassEnd)) * 1.5);
      const nextHigh = Math.min(1, (high / (n - midEnd)) * 1.4);
      const volume = Math.min(1, (total / n) * 1.8);
      setFeatures({
        bass: nextBass,
        mid: nextMid,
        high: nextHigh,
        volume,
        beat: nextBass > 0.58 && nextBass > features.bass,
        isPlaying: audioRef.current ? !audioRef.current.paused : false,
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [features.bass]);

  const playTrack = useCallback(async (id?: string) => {
    const track = tracks.find((item) => item.id === (id ?? selectedTrackId)) ?? tracks[0];
    if (!track) return;
    setError(null);
    stopYouTube();
    setSourceKind('playlist');
    setSelectedTrackId(track.id);
    const audio = await ensureAudio();
    if (audio.src !== new URL(track.url, window.location.href).href) {
      audio.src = track.url;
    }
    await audio.play();
    startAnalyserLoop();
    setStatus(`Playing ${track.label}.`);
  }, [ensureAudio, selectedTrackId, startAnalyserLoop, stopYouTube, tracks]);

  const pausePlaylist = useCallback(() => {
    audioRef.current?.pause();
    setFeatures((current) => ({ ...current, isPlaying: false }));
  }, []);

  const playByOffset = useCallback(async (offset: number) => {
    const index = Math.max(0, tracks.findIndex((track) => track.id === selectedTrackId));
    const nextIndex = (index + offset + tracks.length) % tracks.length;
    await playTrack(tracks[nextIndex]?.id);
  }, [playTrack, selectedTrackId, tracks]);

  const toggle = useCallback(async () => {
    if (sourceKind === 'youtube') {
      if (isPlaying) {
        playerRef.current?.pauseVideo();
        setIsPlaying(false);
        setFeatures(emptyFeatures);
      } else {
        playerRef.current?.playVideo();
        setIsPlaying(true);
      }
      return;
    }
    if (audioRef.current && !audioRef.current.paused) {
      pausePlaylist();
      return;
    }
    await playTrack();
  }, [isPlaying, pausePlaylist, playTrack, sourceKind]);

  const addUploadedTrack = useCallback(async (file: File) => {
    if (file.type !== 'audio/mpeg' && !file.name.toLowerCase().endsWith('.mp3')) {
      throw new Error('Only MP3 uploads are supported.');
    }
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    const track: MusicTrack = {
      id: `upload-${Date.now()}`,
      label: `Local: ${prettifyName(file.name)}`,
      url,
      seed: await hashFile(file),
    };
    setTracks((current) => [track, ...current]);
    setSelectedTrackId(track.id);
    setError(null);
    stopYouTube();
    setSourceKind('playlist');
    const audio = await ensureAudio();
    audio.src = track.url;
    await audio.play();
    startAnalyserLoop();
    setStatus(`Playing ${track.label}.`);
  }, [ensureAudio, startAnalyserLoop, stopYouTube]);

  const startSyntheticYouTubeFeatures = useCallback(() => {
    window.clearInterval(youtubePollRef.current);
    youtubePollRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || player.getPlayerState() !== 1) {
        setIsPlaying(false);
        setFeatures(emptyFeatures);
        return;
      }
      const time = player.getCurrentTime() || 0;
      const duration = Math.max(player.getDuration() || 1, 1);
      const progress = time / duration;
      const bass = Math.max(0, Math.min(1, 0.32 + 0.48 * Math.pow(0.5 + 0.5 * Math.sin(time * 2.2), 2)));
      const mid = Math.max(0, Math.min(1, 0.24 + 0.42 * Math.pow(0.5 + 0.5 * Math.sin(time * 1.4 + 1.1), 2)));
      const high = Math.max(0, Math.min(1, 0.18 + 0.4 * Math.pow(0.5 + 0.5 * Math.sin(time * 3.8 + progress * Math.PI * 4), 2)));
      const bucket = Math.floor(time * 2.2);
      setIsPlaying(true);
      setFeatures({
        bass,
        mid,
        high,
        volume: Math.max(0, Math.min(1, 0.32 + bass * 0.28 + mid * 0.2 + high * 0.16)),
        beat: bucket !== beatBucketRef.current,
        isPlaying: true,
      });
      beatBucketRef.current = bucket;
    }, 120);
  }, []);

  const ensureYouTubePlayer = useCallback(async () => {
    if (playerRef.current) return playerRef.current;
    if (!hostRef.current) throw new Error('YouTube host is not ready.');
    const api = await loadYouTubeIframeApi();
    playerRef.current = await new Promise<YouTubePlayer>((resolve) => {
      let player: YouTubePlayer;
      player = new api.Player(hostRef.current!, {
        width: '1',
        height: '1',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => resolve(player),
          onStateChange: (event) => {
            setIsPlaying(event.data === 1);
            if (event.data !== 1) setFeatures(emptyFeatures);
          },
        },
      });
    });
    return playerRef.current;
  }, []);

  const loadYouTube = useCallback(async (url: string) => {
    setError(null);
    try {
      const parsed = parseYouTubeUrl(url);
      pausePlaylist();
      setSourceKind('youtube');
      const player = await ensureYouTubePlayer();
      if (parsed.playlistId) {
        player.loadPlaylist(parsed.playlistId, 0, 0);
        setStatus('Streaming YouTube playlist.');
      } else if (parsed.videoId) {
        player.loadVideoById(parsed.videoId);
        setStatus('Streaming YouTube video.');
      }
      player.playVideo();
      startSyntheticYouTubeFeatures();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'YouTube audio could not be loaded.';
      setError(message);
      throw new Error(message);
    }
  }, [ensureYouTubePlayer, pausePlaylist, startSyntheticYouTubeFeatures]);

  const value = useMemo<MusicContextValue>(() => ({
    tracks,
    selectedTrackId,
    selectedTrack,
    sourceKind,
    isPlaying,
    status,
    error,
    features,
    setSelectedTrackId,
    playTrack,
    toggle,
    next: () => playByOffset(1),
    previous: () => playByOffset(-1),
    addUploadedTrack,
    loadYouTube,
    youtubeNext: () => playerRef.current?.nextVideo(),
    youtubePrevious: () => playerRef.current?.previousVideo(),
  }), [addUploadedTrack, error, features, isPlaying, loadYouTube, playByOffset, playTrack, selectedTrack, selectedTrackId, sourceKind, status, toggle, tracks]);

  return (
    <MusicContext.Provider value={value}>
      {children}
      <div ref={hostRef} aria-hidden="true" className="fixed bottom-0 right-0 h-px w-px overflow-hidden opacity-0" />
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within MusicProvider.');
  }
  return context;
}
