import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { GenerativeSystem, SystemEvents } from "@/lib/music/generative/system-types";

export class LifeSystem implements GenerativeSystem {
  type = "life" as const;
  dead = true;
  object = new THREE.Group();

  update(audio: AudioFeatures, events: SystemEvents, dt: number): void {
    void audio;
    void events;
    void dt;
    // Placeholder for future cellular automata implementation.
  }

  dispose(): void {
    // No resources yet.
  }
}
