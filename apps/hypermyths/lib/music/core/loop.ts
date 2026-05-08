import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import { detectOnset } from "@/lib/music/audio/onset-detector";
import type { MusicEngine } from "@/lib/music/core/engine";

export type FrameSnapshot = {
  audio: AudioFeatures;
  beat: boolean;
  onset: boolean;
  bpm: number;
  chaos: number;
  spawnRate: number;
  systems: number;
  playing: boolean;
  currentTime: number;
  duration: number;
};

export function startLoop(engine: MusicEngine, onFrame?: (frame: FrameSnapshot) => void): () => void {
  let rafId = 0;
  let last = performance.now();
  let rollingMid = 0;

  const frame = () => {
    rafId = requestAnimationFrame(frame);

    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const audio = engine.audio.update();
    rollingMid = rollingMid * 0.95 + audio.mid * 0.05;

    const beat = engine.beat.detect(audio.bass, engine.audio.freqData);
    if (beat) {
      engine.bpm.addBeat(now);
    }

    const onset = detectOnset(audio.mid + audio.high, rollingMid + 0.001);
    const bpm = engine.bpm.getBpm();

    const events = { beat, onset, bpm };

    engine.director.update(audio, events, dt);

    // Spawn exactly on beat events so new systems always align with the music.
    // Secondary onset spawns are gated by a probability to avoid flooding.
    if (beat) {
      engine.systems.spawn(engine.systems.pickType(engine.random()));
    } else if (onset && engine.random() < 0.25) {
      engine.systems.spawn(engine.systems.pickType(engine.random()));
    }

    engine.systems.update(audio, events, dt * 60, engine.director.chaos);
    engine.background.update(audio, dt);
    engine.renderer.render(audio, beat);

    const state = engine.audio.getState();

    onFrame?.({
      audio,
      beat,
      onset,
      bpm,
      chaos: engine.director.chaos,
      spawnRate: engine.director.spawnRate,
      systems: engine.systems.systems.length,
      playing: state.playing,
      currentTime: state.currentTime,
      duration: state.duration,
    });
  };

  frame();

  return () => {
    cancelAnimationFrame(rafId);
  };
}
