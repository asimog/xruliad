import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { VisualProfile } from "@/lib/music/generative/randomizer";
import type { GenerativeSystem, SystemEvents } from "@/lib/music/generative/system-types";
import { clamp, randomRange } from "@/lib/music/utils/math";

type Shard = {
  velocity: THREE.Vector3;
};

export class FractureSystem implements GenerativeSystem {
  type = "fracture" as const;
  dead = false;

  object: THREE.LineSegments;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.LineBasicMaterial;
  private readonly positions: Float32Array;
  private readonly shards: Shard[];
  private life = 1;

  constructor(profile: VisualProfile) {
    const shardsCount = 150;
    this.positions = new Float32Array(shardsCount * 2 * 3);
    this.shards = new Array(shardsCount).fill(null).map(() => ({
      velocity: new THREE.Vector3(
        randomRange(-0.25, 0.25),
        randomRange(-0.25, 0.25),
        randomRange(-0.08, 0.08),
      ),
    }));

    for (let i = 0; i < shardsCount; i += 1) {
      const base = i * 6;
      const x = randomRange(-1.8, 1.8);
      const y = randomRange(-1.6, 1.6);
      const z = randomRange(-0.6, 0.6);
      const dx = randomRange(-0.12, 0.12);
      const dy = randomRange(-0.12, 0.12);
      const dz = randomRange(-0.03, 0.03);

      this.positions[base] = x;
      this.positions[base + 1] = y;
      this.positions[base + 2] = z;
      this.positions[base + 3] = x + dx;
      this.positions[base + 4] = y + dy;
      this.positions[base + 5] = z + dz;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.LineBasicMaterial({
      color: new THREE.Color(profile.tintB).lerp(new THREE.Color(profile.tintA), 0.6),
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });

    this.object = new THREE.LineSegments(this.geometry, this.material);
    this.object.position.z = -0.4;
  }

  update(audio: AudioFeatures, events: SystemEvents, dt: number, chaos: number): void {
    for (let i = 0; i < this.shards.length; i += 1) {
      const base = i * 6;
      const shard = this.shards[i];

      if (events.beat) {
        shard.velocity.multiplyScalar(1.08 + audio.bass * 0.35);
      }

      shard.velocity.x += randomRange(-0.015, 0.015) * chaos;
      shard.velocity.y += randomRange(-0.015, 0.015) * chaos;
      shard.velocity.multiplyScalar(0.988);

      const vx = shard.velocity.x * dt * 0.05;
      const vy = shard.velocity.y * dt * 0.05;
      const vz = shard.velocity.z * dt * 0.05;

      this.positions[base] += vx;
      this.positions[base + 1] += vy;
      this.positions[base + 2] += vz;
      this.positions[base + 3] += vx;
      this.positions[base + 4] += vy;
      this.positions[base + 5] += vz;

      if (Math.abs(this.positions[base]) > 3.2) this.positions[base] *= -0.6;
      if (Math.abs(this.positions[base + 1]) > 2.6) this.positions[base + 1] *= -0.6;
    }

    this.object.rotation.z += 0.0018 + audio.high * 0.01;
    this.object.rotation.y += 0.0009 + audio.mid * 0.008;

    this.material.opacity = clamp(0.22 + audio.bass * 0.7 + this.life * 0.2, 0, 1);

    this.life -= dt * 0.013;
    if (events.beat) this.life = clamp(this.life + 0.07, 0, 1);

    this.geometry.attributes.position.needsUpdate = true;
    if (this.life <= 0.03) this.dead = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
