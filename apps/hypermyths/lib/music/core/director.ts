import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { VisualProfile } from "@/lib/music/generative/randomizer";
import type { SystemEvents } from "@/lib/music/generative/system-types";

export class Director {
  chaos = 0.5;
  spawnRate = 0.02;
  private baseChaos = 0.5;
  private baseSpawnRate = 0.02;

  setProfile(profile: VisualProfile): void {
    this.baseChaos = profile.baseChaos;
    this.baseSpawnRate = profile.baseSpawnRate;
    this.chaos = profile.baseChaos;
    this.spawnRate = profile.baseSpawnRate;
  }

  update(audio: AudioFeatures, events: SystemEvents, dt: number): void {
    // Chaos tracks loudness directly — rises fast on peaks, decays smoothly.
    const energyTarget = audio.bass * 0.5 + audio.mid * 0.3 + audio.high * 0.2;
    if (energyTarget > this.chaos) {
      this.chaos = Math.min(1, this.chaos + (energyTarget - this.chaos) * 0.18);
    } else {
      this.chaos *= 0.97;
    }

    this.chaos = Math.min(1, Math.max(this.baseChaos * 0.5, this.chaos));
  }
}
