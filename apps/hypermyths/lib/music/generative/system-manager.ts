import type * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import {
  pickSystemType,
  profileFromSeed,
  type VisualProfile,
} from "@/lib/music/generative/randomizer";
import type {
  GenerativeSystem,
  SystemEvents,
  SystemType,
} from "@/lib/music/generative/system-types";
import { BoidsSystem } from "@/lib/music/generative/systems/boids";
import { FluidSystem } from "@/lib/music/generative/systems/fluid";
import { FractureSystem } from "@/lib/music/generative/systems/fracture";
import { LifeSystem } from "@/lib/music/generative/systems/life";
import { ParticlesSystem } from "@/lib/music/generative/systems/particles";
import { SimRunner } from "@/lib/music/sims/sim-runner";
import { getSimEntry } from "@/lib/music/sims";

function createSystem(
  type: SystemType,
  profile: VisualProfile,
): GenerativeSystem {
  switch (type) {
    case "particles":
      return new ParticlesSystem(profile);
    case "life":
      return new LifeSystem();
    case "boids":
      return new BoidsSystem(profile);
    case "fluid":
      return new FluidSystem();
    case "fracture":
      return new FractureSystem(profile);
    default:
      return new ParticlesSystem(profile);
  }
}

export class SystemManager {
  systems: GenerativeSystem[] = [];
  profile: VisualProfile = profileFromSeed("music-default");

  /** Currently active JS sim (if any) */
  private activeJsSim: SimRunner | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly maxSystems = 10,
  ) {}

  setProfile(profile: VisualProfile): void {
    this.profile = profile;
  }

  pickType(r: number): SystemType {
    return pickSystemType(this.profile.spawnWeights, r);
  }

  spawn(type: SystemType): void {
    if (this.systems.length >= this.maxSystems) {
      const old = this.systems.shift();
      if (old) {
        this.scene.remove(old.object);
        old.dispose();
      }
    }

    const system = createSystem(type, this.profile);
    this.scene.add(system.object);
    this.systems.push(system);
  }

  /**
   * Spawn a raw .js simulation from the three.js sims collection.
   * Only one JS sim can be active at a time (they're heavy on particles).
   * Returns a promise that resolves when the sim is loaded and spawned.
   */
  async spawnJsSim(simId: string): Promise<void> {
    const entry = getSimEntry(simId);
    if (!entry) return;

    // Remove existing JS sim if any
    if (this.activeJsSim) {
      this.scene.remove(this.activeJsSim.object);
      this.activeJsSim.dispose();
      this.activeJsSim = null;
    }

    try {
      const ctor = await entry.loadCtor();
      const sim = new SimRunner(this.scene, ctor, entry.particleCount);
      this.activeJsSim = sim;
    } catch (err) {
      console.error(`Failed to spawn JS sim "${simId}":`, err);
    }
  }

  /** Check if a JS sim is currently active */
  hasJsSim(): boolean {
    return this.activeJsSim !== null;
  }

  update(
    audio: AudioFeatures,
    events: SystemEvents,
    dt: number,
    chaos: number,
  ): void {
    for (const system of this.systems) {
      system.update(audio, events, dt, chaos);
    }

    // Update the active JS sim with audio features
    if (this.activeJsSim) {
      this.activeJsSim.update(audio, events, dt, chaos);
    }

    this.systems = this.systems.filter((system) => {
      if (system.dead) {
        this.scene.remove(system.object);
        system.dispose();
        return false;
      }
      return true;
    });
  }

  dispose(): void {
    for (const system of this.systems) {
      this.scene.remove(system.object);
      system.dispose();
    }
    this.systems = [];

    if (this.activeJsSim) {
      this.scene.remove(this.activeJsSim.object);
      this.activeJsSim.dispose();
      this.activeJsSim = null;
    }
  }
}
