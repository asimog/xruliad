"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/**
 * Global audio reactive context.
 * Provides audio features (bass, mid, high, volume, beat) from any playing music
 * to any component that wants to react to audio (e.g., the particle background).
 */

export interface AudioFeatures {
  bass: number;
  mid: number;
  high: number;
  volume: number;
  beat: boolean;
  isPlaying: boolean;
}

interface AudioReactiveContextType {
  features: AudioFeatures;
  registerAnalyser: (analyser: AnalyserNode | null) => void;
  registerPlaybackState: (getState: () => { playing: boolean }) => void;
}

const AudioReactiveContext = createContext<AudioReactiveContextType | null>(
  null,
);

export function useAudioReactive(): AudioReactiveContextType | null {
  return useContext(AudioReactiveContext);
}

/**
 * Provider that wraps the app and exposes audio reactivity.
 * The music engine (or any audio source) registers its AnalyserNode here.
 * Consumers (like the particle background) read the computed features.
 */
export function AudioReactiveProvider({ children }: { children: ReactNode }) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const getStateRef = useRef<(() => { playing: boolean }) | null>(null);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animFrameRef = useRef<number>(0);

  const [features, setFeatures] = useState<AudioFeatures>({
    bass: 0,
    mid: 0,
    high: 0,
    volume: 0,
    beat: false,
    isPlaying: false,
  });

  // Smoothed features to avoid jitter
  const smoothedRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0 });
  const lastBassRef = useRef(0);
  const beatThresholdRef = useRef(0);

  // Continuous polling to extract features from the registered analyser
  const startFeatureExtraction = useCallback(() => {
    const extract = () => {
      const analyser = analyserRef.current;
      const getState = getStateRef.current;

      if (!analyser || !getState) {
        // No audio source — reset features smoothly
        setFeatures((prev) => {
          const decay = 0.95;
          return {
            bass: prev.bass * decay,
            mid: prev.mid * decay,
            high: prev.high * decay,
            volume: prev.volume * decay,
            beat: false,
            isPlaying: false,
          };
        });
        smoothedRef.current = { bass: 0, mid: 0, high: 0, volume: 0 };
        animFrameRef.current = requestAnimationFrame(extract);
        return;
      }

      const state = getState();
      if (!state.playing) {
        setFeatures((prev) => {
          const decay = 0.95;
          return {
            bass: prev.bass * decay,
            mid: prev.mid * decay,
            high: prev.high * decay,
            volume: prev.volume * decay,
            beat: false,
            isPlaying: false,
          };
        });
        smoothedRef.current = { bass: 0, mid: 0, high: 0, volume: 0 };
        animFrameRef.current = requestAnimationFrame(extract);
        return;
      }

      // Extract frequency data
      const binCount = analyser.frequencyBinCount;
      if (freqDataRef.current?.length !== binCount) {
        freqDataRef.current = new Uint8Array(binCount);
        timeDataRef.current = new Uint8Array(binCount);
      }

      analyser.getByteFrequencyData(freqDataRef.current!);
      analyser.getByteTimeDomainData(timeDataRef.current!);

      const freq = freqDataRef.current!;
      const time = timeDataRef.current!;

      // Compute band energies (normalized 0-1)
      const bass = avg(freq, 0, 50) / 255;
      const mid = avg(freq, 50, 150) / 255;
      const high = avg(freq, 150, 300) / 255;
      const volume = rms(time) / 255;

      // Smooth with exponential moving average
      const smoothFactor = 0.15;
      const smoothed = smoothedRef.current;
      smoothed.bass = smoothed.bass * (1 - smoothFactor) + bass * smoothFactor;
      smoothed.mid = smoothed.mid * (1 - smoothFactor) + mid * smoothFactor;
      smoothed.high = smoothed.high * (1 - smoothFactor) + high * smoothFactor;
      smoothed.volume =
        smoothed.volume * (1 - smoothFactor) + volume * smoothFactor;

      // Beat detection: bass onset detection
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
        isPlaying: true,
      });

      animFrameRef.current = requestAnimationFrame(extract);
    };

    animFrameRef.current = requestAnimationFrame(extract);
  }, []);

  // Helper: average a range of frequency bins
  function avg(
    data: Uint8Array<ArrayBuffer>,
    start: number,
    end: number,
  ): number {
    let sum = 0;
    const count = Math.min(end, data.length) - start;
    for (let i = start; i < start + count; i++) {
      sum += data[i]!;
    }
    return count > 0 ? sum / count : 0;
  }

  // Helper: RMS of time domain data
  function rms(data: Uint8Array<ArrayBuffer>): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i]! - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length) * 255;
  }

  // Start extraction loop on mount
  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
    startFeatureExtraction();
  }

  // Cleanup on unmount
  const cleanupRef = useRef<(() => void) | null>(null);
  if (!cleanupRef.current) {
    cleanupRef.current = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }

  const registerAnalyser = useCallback((analyser: AnalyserNode | null) => {
    analyserRef.current = analyser;
  }, []);

  const registerPlaybackState = useCallback(
    (getState: () => { playing: boolean }) => {
      getStateRef.current = getState;
    },
    [],
  );

  return (
    <AudioReactiveContext.Provider
      value={{ features, registerAnalyser, registerPlaybackState }}
    >
      {children}
    </AudioReactiveContext.Provider>
  );
}
