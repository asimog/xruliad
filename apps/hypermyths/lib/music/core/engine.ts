import { AudioEngine } from "@/lib/music/audio/audio-engine";
import { BeatDetector } from "@/lib/music/audio/beat-detector";
import { BpmTracker } from "@/lib/music/audio/bpm";
import { Director } from "@/lib/music/core/director";
import { startLoop, type FrameSnapshot } from "@/lib/music/core/loop";
import { Background } from "@/lib/music/generative/background";
import {
  profileFromSeed,
  randomProfile,
  type VisualProfile,
} from "@/lib/music/generative/randomizer";
import {
  BUILTIN_SIMULATIONS,
  buildSimulationLibrary,
  getSimulationById,
  type SimulationEntry,
} from "@/lib/music/generative/simulation-library";
import { SystemManager } from "@/lib/music/generative/system-manager";
import { Renderer } from "@/lib/music/render/renderer";
import { seededRandom } from "@/lib/music/utils/seed";
import {
  getSimEntries,
  getSimsByCategory,
  type SimEntry,
  type SimCategory,
} from "@/lib/music/sims";

export type EngineController = {
  loadTrack(url: string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  togglePlayback(): Promise<void>;
  resumeAudio(): Promise<void>;
  seekBy(seconds: number): void;
  getAnalyser(): AnalyserNode | null;
  isPlaying(): boolean;
  setTrackSeed(seed: string): VisualProfile;
  getSimulations(): SimulationEntry[];
  setSimulationLibrary(
    simulations: Partial<SimulationEntry>[],
  ): SimulationEntry[];
  setSimulation(simulationId: string): SimulationEntry;
  stepSimulation(direction: 1 | -1): SimulationEntry;
  randomizeExperience(): {
    profile: VisualProfile;
    simulation: SimulationEntry;
  };
  /** Get all available raw JS sims */
  getJsSims(): SimEntry[];
  /** Get JS sims filtered by category */
  getJsSimsByCategory(category: SimCategory): SimEntry[];
  /** Spawn a specific JS sim (replaces any currently active JS sim) */
  spawnJsSim(simId: string): Promise<void>;
  /** Clear the currently active JS sim */
  clearJsSim(): void;
  dispose(): void;
};

export type MusicEngine = {
  audio: AudioEngine;
  beat: BeatDetector;
  bpm: BpmTracker;
  director: Director;
  systems: SystemManager;
  background: Background;
  renderer: Renderer;
  random: () => number;
};

export function createEngine(
  canvas: HTMLCanvasElement,
  onFrame?: (frame: FrameSnapshot) => void,
): EngineController {
  const audio = new AudioEngine();
  const beat = new BeatDetector();
  const bpm = new BpmTracker();
  const director = new Director();
  const renderer = new Renderer(canvas);
  const systems = new SystemManager(renderer.scene, 12);
  const background = new Background(
    renderer.scene,
    canvas.clientWidth || window.innerWidth,
    canvas.clientHeight || window.innerHeight,
  );

  let random = Math.random;
  let trackSeed = "music-default-track";
  let simulationLibrary = BUILTIN_SIMULATIONS;
  let simulation = simulationLibrary[0];

  const setProfile = (profile: VisualProfile) => {
    systems.setProfile(profile);
    background.setProfile(profile);
    director.setProfile(profile);
    return profile;
  };

  const applyCompositeSeed = (): VisualProfile => {
    const seed = `${trackSeed}::${simulation.seedTag}`;
    random = seededRandom(seed);
    return setProfile(profileFromSeed(seed, simulation.motionFamily));
  };

  applyCompositeSeed();

  const engine: MusicEngine = {
    audio,
    beat,
    bpm,
    director,
    systems,
    background,
    renderer,
    random: () => random(),
  };

  const stopLoop = startLoop(engine, onFrame);

  const onResize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.resize(width, height);
    background.resize(width, height);
  };
  window.addEventListener("resize", onResize);
  onResize();

  return {
    async loadTrack(url: string) {
      beat.reset();
      bpm.reset();
      await audio.load(url);
    },
    async play() {
      await audio.play();
    },
    pause() {
      audio.pause();
    },
    async togglePlayback() {
      const state = audio.getState();
      if (state.playing) {
        audio.pause();
      } else {
        await audio.play();
      }
    },
    async resumeAudio() {
      await audio.resume();
    },
    seekBy(seconds: number) {
      const next = Math.max(0, audio.audio.currentTime + seconds);
      audio.audio.currentTime = next;
    },
    getAnalyser() {
      return audio.analyser;
    },
    isPlaying() {
      return audio.getState().playing;
    },
    setTrackSeed(seed: string) {
      trackSeed = seed;
      return applyCompositeSeed();
    },
    getSimulations() {
      return simulationLibrary;
    },
    setSimulationLibrary(simulations) {
      simulationLibrary = buildSimulationLibrary(simulations);
      simulation = simulationLibrary[0];
      applyCompositeSeed();
      return simulationLibrary;
    },
    setSimulation(simulationId: string) {
      const found =
        getSimulationById(simulationId, simulationLibrary) ??
        simulationLibrary[0];
      simulation = found;
      applyCompositeSeed();
      return simulation;
    },
    stepSimulation(direction: 1 | -1) {
      const sims = simulationLibrary;
      const idx = sims.findIndex((item) => item.id === simulation.id);
      const nextIndex = (idx + direction + sims.length) % sims.length;
      simulation = sims[nextIndex];
      applyCompositeSeed();
      return simulation;
    },
    randomizeExperience() {
      const sims = simulationLibrary;
      simulation = sims[Math.floor(Math.random() * sims.length)];

      const profile = randomProfile();
      random = seededRandom(
        `${profile.id}::${simulation.seedTag}::${trackSeed}`,
      );
      setProfile(profile);

      return { profile, simulation };
    },
    getJsSims() {
      return getSimEntries();
    },
    getJsSimsByCategory(category: SimCategory) {
      return getSimsByCategory(category);
    },
    spawnJsSim(simId: string): Promise<void> {
      return systems.spawnJsSim(simId);
    },
    clearJsSim() {
      // Handled by spawnJsSim replacing the current sim,
      // or by dispose on engine cleanup
    },
    dispose() {
      window.removeEventListener("resize", onResize);
      stopLoop();
      systems.dispose();
      background.dispose();
      renderer.dispose();
      audio.dispose();
    },
  };
}
