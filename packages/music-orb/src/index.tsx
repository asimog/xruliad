"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Features = { bass: number; mid: number; high: number; volume: number; beat: boolean; isPlaying: boolean };
type MusicOrbContextValue = {
  isPlaying: boolean;
  muted: boolean;
  volume: number;
  visualOnly: boolean;
  features: Features;
  toggle: () => Promise<void>;
  setMuted: (next: boolean) => void;
  setVolume: (next: number) => void;
};

const emptyFeatures: Features = { bass: 0, mid: 0, high: 0, volume: 0, beat: false, isPlaying: false };
const MusicOrbContext = createContext<MusicOrbContextValue | null>(null);

export function MusicOrbProvider({
  children,
  audioSrc,
  defaultMuted = true,
  visualOnly = false
}: {
  children: ReactNode;
  audioSrc?: string;
  defaultMuted?: boolean;
  visualOnly?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef(0);
  const beatRef = useRef(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMutedState] = useState(defaultMuted);
  const [volume, setVolumeState] = useState(0.45);
  const [features, setFeatures] = useState<Features>(emptyFeatures);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    if (audioRef.current) audioRef.current.muted = next;
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const ensureAudio = useCallback(async () => {
    if (visualOnly || !audioSrc) return null;
    if (!audioRef.current) {
      const audio = new Audio(audioSrc);
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.muted = muted;
      audio.volume = volume;
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audioRef.current = audio;
    }
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return audioRef.current;
      const ctx = new Ctor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    return audioRef.current;
  }, [audioSrc, muted, visualOnly, volume]);

  useEffect(() => {
    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser || !isPlaying) {
        setFeatures((current) => (current.isPlaying ? emptyFeatures : current));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const band = (start: number, end: number) => {
        let sum = 0;
        for (let i = start; i < end; i += 1) sum += data[i] ?? 0;
        return sum / Math.max(1, end - start) / 255;
      };
      const bass = band(0, 8);
      const mid = band(8, 42);
      const high = band(42, 120);
      const level = Math.min(1, bass * 0.42 + mid * 0.34 + high * 0.24);
      const bucket = Math.floor(performance.now() / 420);
      const beat = bass > 0.42 && bucket !== beatRef.current;
      if (beat) beatRef.current = bucket;
      setFeatures({ bass, mid, high, volume: level, beat, isPlaying });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const toggle = useCallback(async () => {
    if (visualOnly || !audioSrc) {
      setIsPlaying((current) => !current);
      return;
    }
    const audio = await ensureAudio();
    if (!audio) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  }, [audioSrc, ensureAudio, visualOnly]);

  const value = useMemo(
    () => ({ isPlaying, muted, volume, visualOnly, features, toggle, setMuted, setVolume }),
    [features, isPlaying, muted, setMuted, setVolume, toggle, visualOnly, volume]
  );

  return <MusicOrbContext.Provider value={value}>{children}</MusicOrbContext.Provider>;
}

export function useMusicOrb() {
  const context = useContext(MusicOrbContext);
  if (!context) throw new Error("useMusicOrb must be used inside MusicOrbProvider");
  return context;
}

export function MusicOrb({ label = "Ecosystem music orb", motion = true }: { label?: string; motion?: boolean }) {
  const music = useMusicOrb();
  const pulse = 1 + music.features.volume * 0.32 + (music.features.beat ? 0.16 : 0);
  return (
    <div className={`music-orb ${music.isPlaying ? "music-orb--playing" : ""} ${motion ? "" : "music-orb--still"}`}>
      <button
        type="button"
        className="music-orb__button"
        aria-label={music.isPlaying ? `Pause ${label}` : `Play ${label}`}
        aria-pressed={music.isPlaying}
        onClick={() => void music.toggle()}
        style={{ transform: `scale(${pulse})` }}
      >
        <span className="music-orb__core" aria-hidden="true" />
      </button>
      <label className="music-orb__volume">
        <span>{music.muted ? "Muted" : "Volume"}</span>
        <input
          aria-label="Music orb volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={music.volume}
          onChange={(event) => music.setVolume(Number(event.target.value))}
        />
      </label>
      <button className="music-orb__mute" type="button" onClick={() => music.setMuted(!music.muted)}>
        {music.muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}
