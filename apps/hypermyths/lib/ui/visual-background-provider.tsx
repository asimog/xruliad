"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ParticleEngineAPI } from "@/components/mythx/ParticleMediaEngine";

export type OrbFormation = "sphere" | "cube" | "helix" | "donut" | "galaxy";
export type VisualMode = "uberviz" | "particles";

type VisualBackgroundContextValue = {
  backgroundEnabled: boolean;
  toggleBackgroundEnabled: () => void;
  setBackgroundEnabled: (next: boolean) => void;
  visualMode: VisualMode;
  setVisualMode: (next: VisualMode) => void;
  particleEngine: ParticleEngineAPI | null;
  setParticleEngine: (engine: ParticleEngineAPI | null) => void;
  orbFormation: OrbFormation;
  setOrbFormation: (next: OrbFormation) => void;
  orbParticleCount: number;
  setOrbParticleCount: (next: number) => void;
  orbGlowIntensity: number;
  setOrbGlowIntensity: (next: number) => void;
  isOrbInteractive: boolean;
  setIsOrbInteractive: (next: boolean) => void;
};

const STORAGE_KEY = "hypermyths.background-enabled";
const VISUAL_MODE_KEY = "hypermyths.visual-mode";
const ORB_FORMATION_KEY = "hypermyths.orb-formation";
const ORB_PARTICLE_COUNT_KEY = "hypermyths.orb-particle-count";
const ORB_GLOW_KEY = "hypermyths.orb-glow";
const ORB_PARTICLE_MIN = 100;
const ORB_PARTICLE_MAX = 1000;
const ORB_PARTICLE_DEFAULT = 100;

const VisualBackgroundContext =
  createContext<VisualBackgroundContextValue | null>(null);

function readStoredBackgroundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "false";
}

function readStoredVisualMode(): VisualMode {
  if (typeof window === "undefined") return "uberviz";
  const stored = window.localStorage.getItem(VISUAL_MODE_KEY);
  if (stored === "particles" || stored === "uberviz") {
    return stored;
  }
  return "uberviz";
}

function readStoredFormation(): OrbFormation {
  if (typeof window === "undefined") return "galaxy";
  const storedFormation = window.localStorage.getItem(ORB_FORMATION_KEY);
  if (
    storedFormation === "sphere" ||
    storedFormation === "cube" ||
    storedFormation === "helix" ||
    storedFormation === "donut" ||
    storedFormation === "galaxy"
  ) {
    return storedFormation;
  }
  return "galaxy";
}

function readStoredParticleCount(): number {
  if (typeof window === "undefined") return ORB_PARTICLE_DEFAULT;
  const raw = Number(window.localStorage.getItem(ORB_PARTICLE_COUNT_KEY));
  if (!Number.isFinite(raw)) return ORB_PARTICLE_DEFAULT;
  return Math.max(ORB_PARTICLE_MIN, Math.min(ORB_PARTICLE_MAX, Math.round(raw)));
}

function readStoredGlowIntensity(): number {
  if (typeof window === "undefined") return 0.5;
  const raw = Number(window.localStorage.getItem(ORB_GLOW_KEY));
  if (!Number.isFinite(raw)) return 0.5;
  return Math.max(0, Math.min(1, raw));
}

export function VisualBackgroundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [backgroundEnabled, setBackgroundEnabledState] = useState(
    readStoredBackgroundEnabled,
  );
  const [visualMode, setVisualModeState] = useState<VisualMode>(
    readStoredVisualMode,
  );
  const [particleEngine, setParticleEngineState] =
    useState<ParticleEngineAPI | null>(null);
  const [orbFormation, setOrbFormationState] = useState<OrbFormation>(
    readStoredFormation,
  );
  const [orbParticleCount, setOrbParticleCountState] = useState(
    readStoredParticleCount,
  );
  const [orbGlowIntensity, setOrbGlowIntensityState] = useState(
    readStoredGlowIntensity,
  );
  const [isOrbInteractive, setIsOrbInteractiveState] = useState(false);

  const setBackgroundEnabled = useCallback((next: boolean) => {
    setBackgroundEnabledState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  const setVisualMode = useCallback((next: VisualMode) => {
    setVisualModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VISUAL_MODE_KEY, next);
    }
  }, []);

  const setParticleEngine = useCallback((engine: ParticleEngineAPI | null) => {
    setParticleEngineState(engine);
  }, []);

  const setOrbFormation = useCallback((next: OrbFormation) => {
    setOrbFormationState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ORB_FORMATION_KEY, next);
    }
  }, []);

  const setOrbParticleCount = useCallback((next: number) => {
    const clamped = Math.max(
      ORB_PARTICLE_MIN,
      Math.min(ORB_PARTICLE_MAX, Math.round(next)),
    );
    setOrbParticleCountState(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ORB_PARTICLE_COUNT_KEY, String(clamped));
    }
  }, []);

  const setOrbGlowIntensity = useCallback((next: number) => {
    setOrbGlowIntensityState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ORB_GLOW_KEY, String(next));
    }
  }, []);

  const setIsOrbInteractive = useCallback((next: boolean) => {
    setIsOrbInteractiveState(next);
  }, []);

  const toggleBackgroundEnabled = useCallback(() => {
    setBackgroundEnabled(!backgroundEnabled);
  }, [backgroundEnabled, setBackgroundEnabled]);

  const value = useMemo(
    () => ({
      backgroundEnabled,
      toggleBackgroundEnabled,
      setBackgroundEnabled,
      visualMode,
      setVisualMode,
      particleEngine,
      setParticleEngine,
      orbFormation,
      setOrbFormation,
      orbParticleCount,
      setOrbParticleCount,
      orbGlowIntensity,
      setOrbGlowIntensity,
      isOrbInteractive,
      setIsOrbInteractive,
    }),
    [
      backgroundEnabled,
      isOrbInteractive,
      orbFormation,
      orbGlowIntensity,
      orbParticleCount,
      particleEngine,
      setBackgroundEnabled,
      setIsOrbInteractive,
      setOrbFormation,
      setOrbGlowIntensity,
      setOrbParticleCount,
      setParticleEngine,
      setVisualMode,
      toggleBackgroundEnabled,
      visualMode,
    ],
  );

  return (
    <VisualBackgroundContext.Provider value={value}>
      {children}
    </VisualBackgroundContext.Provider>
  );
}

export function useVisualBackground() {
  const context = useContext(VisualBackgroundContext);
  if (!context) {
    throw new Error(
      "useVisualBackground must be used inside VisualBackgroundProvider.",
    );
  }
  return context;
}
