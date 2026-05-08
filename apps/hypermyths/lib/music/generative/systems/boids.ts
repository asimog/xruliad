import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { VisualProfile } from "@/lib/music/generative/randomizer";
import type { GenerativeSystem, SystemEvents } from "@/lib/music/generative/system-types";
import { clamp, randomRange } from "@/lib/music/utils/math";

type Agent = {
  velocity: THREE.Vector3;
};

export class BoidsSystem implements GenerativeSystem {
  type = "boids" as const;
  dead = false;

  object: THREE.Points;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly positions: Float32Array;
  private readonly agents: Agent[];
  private life = 1;

  constructor(profile: VisualProfile) {
    const count = 220;
    this.positions = new Float32Array(count * 3);

    this.agents = new Array(count).fill(null).map((_, i) => {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.15;
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;

      this.positions[i3]     = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = randomRange(-0.1, 0.1);

      const outSpeed = 0.1 + Math.random() * 0.4;

      return {
        velocity: new THREE.Vector3(
          Math.cos(theta) * outSpeed,
          Math.sin(theta) * outSpeed,
          randomRange(-0.05, 0.05),
        ),
      };
    });

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      color: new THREE.Color(profile.tintA),
      size: 0.03,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.object = new THREE.Points(this.geometry, this.material);
    this.object.position.z = -0.5;
  }

  update(audio: AudioFeatures, events: SystemEvents, dt: number, chaos: number): void {
    const center = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < this.agents.length; i += 1) {
      const i3 = i * 3;
      center.x += this.positions[i3];
      center.y += this.positions[i3 + 1];
      center.z += this.positions[i3 + 2];
    }

    center.multiplyScalar(1 / this.agents.length);

    const pace = 0.012 + audio.mid * 0.04;
    for (let i = 0; i < this.agents.length; i += 1) {
      const i3 = i * 3;
      const agent = this.agents[i];

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const toCenter = new THREE.Vector3(center.x - px, center.y - py, center.z - pz);
      toCenter.multiplyScalar(0.005 + audio.bass * 0.03);

      agent.velocity.add(toCenter);
      agent.velocity.x += randomRange(-0.02, 0.02) * chaos;
      agent.velocity.y += randomRange(-0.02, 0.02) * chaos;
      agent.velocity.z += randomRange(-0.01, 0.01);

      if (events.beat) {
        agent.velocity.multiplyScalar(1.12 + audio.bass * 0.2);
      }

      agent.velocity.multiplyScalar(0.982);

      this.positions[i3] += agent.velocity.x * dt * pace;
      this.positions[i3 + 1] += agent.velocity.y * dt * pace;
      this.positions[i3 + 2] += agent.velocity.z * dt * pace;

      if (Math.abs(this.positions[i3]) > 3) this.positions[i3] *= -0.7;
      if (Math.abs(this.positions[i3 + 1]) > 2.5) this.positions[i3 + 1] *= -0.7;
      if (Math.abs(this.positions[i3 + 2]) > 1.8) this.positions[i3 + 2] *= -0.7;
    }

    this.material.size = clamp(0.02 + audio.high * 0.06, 0.02, 0.08);
    this.material.opacity = clamp(0.3 + audio.mid * 0.6 + this.life * 0.2, 0, 1);

    this.life -= dt * 0.012;
    if (events.beat) this.life = clamp(this.life + 0.08, 0, 1);

    this.geometry.attributes.position.needsUpdate = true;
    if (this.life <= 0.03) this.dead = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
