import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { GenerativeSystem, SystemEvents } from "@/lib/music/generative/system-types";

export class FluidSystem implements GenerativeSystem {
  type = "fluid" as const;
  dead = true;
  object = new THREE.Group();

  update(audio: AudioFeatures, events: SystemEvents, dt: number): void {
    void audio;
    void events;
    void dt;
    // Placeholder for fluid simulation implementation.
  }

  dispose(): void {
    // No resources yet.
  }
}
