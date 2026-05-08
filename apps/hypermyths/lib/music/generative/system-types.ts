import type * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";

export type SystemType = "particles" | "life" | "boids" | "fluid" | "fracture";

export type SystemEvents = {
  beat: boolean;
  onset: boolean;
  bpm: number;
};

export interface GenerativeSystem {
  type: SystemType;
  dead: boolean;
  object: THREE.Object3D;
  update(audio: AudioFeatures, events: SystemEvents, dt: number, chaos: number): void;
  dispose(): void;
}
