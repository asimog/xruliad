import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { VisualProfile } from "@/lib/music/generative/randomizer";
import type { GenerativeSystem, SystemEvents } from "@/lib/music/generative/system-types";
import { clamp, randomRange } from "@/lib/music/utils/math";

type Particle = {
  velocity: THREE.Vector3;
};

export class ParticlesSystem implements GenerativeSystem {
  type = "particles" as const;
  dead = false;

  object: THREE.Points;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly positions: Float32Array;
  private readonly particles: Particle[];
  private life = 1;
  private readonly variant: VisualProfile["particleVariant"];

  constructor(profile: VisualProfile) {
    this.variant = profile.particleVariant;

    const count = 700;
    this.positions = new Float32Array(count * 3);

    // Spawn tightly around the origin and give each particle an outward kick
    // so the system erupts from the lantern core and then shapes itself via
    // the variant force fields.
    this.particles = new Array(count).fill(null).map((_, i) => {
      const i3 = i * 3;

      // Compact spherical spawn near center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 0.18;

      const px = r * Math.sin(phi) * Math.cos(theta);
      const py = r * Math.sin(phi) * Math.sin(theta);
      const pz = r * Math.cos(phi) * 0.5;

      this.positions[i3]     = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;

      // Initial velocity pointing outward from origin
      const outAngle = Math.atan2(py, px);
      const outSpeed = 0.12 + Math.random() * 0.55;

      return {
        velocity: new THREE.Vector3(
          Math.cos(outAngle) * outSpeed + randomRange(-0.05, 0.05),
          Math.sin(outAngle) * outSpeed + randomRange(-0.05, 0.05),
          randomRange(-0.12, 0.12),
        ),
      };
    });

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      color: new THREE.Color(profile.tintA),
      size: 0.024,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.object = new THREE.Points(this.geometry, this.material);
    this.object.position.z = -1;
  }

  private updateVariant(
    i3: number,
    i: number,
    dt: number,
    bassPush: number,
    midPush: number,
    flutter: number,
    chaos: number,
  ): void {
    const p = this.particles[i];
    const t = performance.now() * 0.001;
    const n = this.particles.length;
    const ratio = i / n;
    const x = this.positions[i3];
    const y = this.positions[i3 + 1];
    const z = this.positions[i3 + 2];

    if (this.variant === "rain") {
      p.velocity.x += randomRange(-0.012, 0.012) * chaos;
      p.velocity.y -= 0.022 + bassPush * 0.01;
      p.velocity.z *= 0.98;
    } else if (this.variant === "orbit" || this.variant === "swarm") {
      const angle = Math.atan2(y, x) + 0.01 + bassPush * 0.002;
      const radius = Math.sqrt(x * x + y * y) + 0.0001;
      p.velocity.x += (Math.cos(angle) * radius - x) * 0.015;
      p.velocity.y += (Math.sin(angle) * radius - y) * 0.015;
    } else if (this.variant === "helix") {
      const phase = (i * 0.03 + t * 0.9) % (Math.PI * 2);
      p.velocity.x += Math.cos(phase) * 0.01 * (1 + bassPush);
      p.velocity.z += Math.sin(phase) * 0.01 * (1 + bassPush);
      p.velocity.y -= 0.008 + flutter * 0.002 + midPush * 0.001;
    } else if (this.variant === "lattice") {
      const grid = 0.35;
      const tx = Math.round(this.positions[i3] / grid) * grid;
      const ty = Math.round(this.positions[i3 + 1] / grid) * grid;
      p.velocity.x += (tx - this.positions[i3]) * 0.03;
      p.velocity.y += (ty - this.positions[i3 + 1]) * 0.03;
      p.velocity.z += randomRange(-0.003, 0.003);
    } else if (this.variant === "torus") {
      const a = ratio * Math.PI * 2 * 18 + t * (0.5 + bassPush * 0.2);
      const b = ratio * Math.PI * 2 * 47 - t * (1.1 + flutter * 0.2);
      const R = 1.9 + bassPush * 0.65;
      const r = 0.55 + flutter * 0.3;
      const tx = (R + r * Math.cos(b)) * Math.cos(a);
      const ty = (R + r * Math.cos(b)) * Math.sin(a);
      const tz = r * Math.sin(b);
      p.velocity.x += (tx - x) * 0.026;
      p.velocity.y += (ty - y) * 0.026;
      p.velocity.z += (tz - z) * 0.026;
    } else if (this.variant === "sphere") {
      const phi = Math.acos(1 - 2 * ratio);
      const theta = ratio * Math.PI * 2 * 140 + t * 0.35;
      const radius = 1.1 + Math.sin(t * 1.9 + ratio * 32) * (0.3 + bassPush * 0.25);
      const tx = radius * Math.sin(phi) * Math.cos(theta);
      const ty = radius * Math.sin(phi) * Math.sin(theta);
      const tz = radius * Math.cos(phi);
      p.velocity.x += (tx - x) * 0.024;
      p.velocity.y += (ty - y) * 0.024;
      p.velocity.z += (tz - z) * 0.024;
    } else if (this.variant === "galaxy") {
      const arm = i % 3;
      const armPhase = arm * ((Math.PI * 2) / 3);
      const r = 0.4 + ratio * 2.3 + midPush * 0.08;
      const ang = armPhase + r * (1.6 + chaos * 1.5) + t * (0.35 + bassPush * 0.25);
      const tx = Math.cos(ang) * r;
      const ty = Math.sin(ang) * r;
      const tz = Math.sin(r * 5 + t * 1.1) * (0.3 + flutter * 0.2);
      p.velocity.x += (tx - x) * 0.019;
      p.velocity.y += (ty - y) * 0.019;
      p.velocity.z += (tz - z) * 0.019;
    } else if (this.variant === "vortex") {
      const ang = Math.atan2(y, x) + 0.06 + bassPush * 0.03;
      const rad = Math.sqrt(x * x + y * y) + 0.001;
      const tx = Math.cos(ang) * rad * 0.97;
      const ty = Math.sin(ang) * rad * 0.97;
      const tz = z - 0.02 - flutter * 0.01;
      p.velocity.x += (tx - x) * 0.021;
      p.velocity.y += (ty - y) * 0.021;
      p.velocity.z += (tz - z) * 0.021;
    } else if (this.variant === "kuramoto") {
      const phase = t * (0.7 + bassPush * 0.25 + midPush * 0.08) + ratio * Math.PI * 2 * 12;
      const coupled = phase + Math.sin(phase * 0.5 + flutter * 6) * 0.6;
      const tx = Math.cos(coupled) * (1.2 + bassPush * 0.4);
      const ty = Math.sin(coupled) * (1.2 + bassPush * 0.4);
      const tz = Math.sin(coupled * 2 + t) * (0.55 + chaos * 0.3);
      p.velocity.x += (tx - x) * 0.023;
      p.velocity.y += (ty - y) * 0.023;
      p.velocity.z += (tz - z) * 0.023;
    } else if (this.variant === "mobius") {
      const u = ratio * Math.PI * 2 * 24 + t * 0.65;
      const v = Math.sin(ratio * Math.PI * 2 * 3 + t * 0.8);
      const R = 1.4 + bassPush * 0.25;
      const tx = (R + 0.5 * v * Math.cos(u / 2)) * Math.cos(u);
      const ty = (R + 0.5 * v * Math.cos(u / 2)) * Math.sin(u);
      const tz = 0.5 * v * Math.sin(u / 2);
      p.velocity.x += (tx - x) * 0.021;
      p.velocity.y += (ty - y) * 0.021;
      p.velocity.z += (tz - z) * 0.021;
    } else if (this.variant === "tesseract") {
      const ax = Math.sin(ratio * 67.3 + t) * 0.95;
      const ay = Math.cos(ratio * 41.7 - t * 0.8) * 0.95;
      const az = Math.sin(ratio * 29.9 + t * 1.2) * 0.95;
      const aw = Math.cos(ratio * 53.1 + t * 0.6) * 0.95;
      const c = Math.cos(t * 0.7);
      const s = Math.sin(t * 0.7);
      const rx = ax * c - aw * s;
      const rw = ax * s + aw * c;
      const persp = 2.2 + bassPush * 0.4 - rw;
      const proj = persp === 0 ? 0.0001 : 1 / persp;
      const tx = rx * proj * 2.0;
      const ty = ay * proj * 2.0;
      const tz = az * proj * 2.0;
      p.velocity.x += (tx - x) * 0.026;
      p.velocity.y += (ty - y) * 0.026;
      p.velocity.z += (tz - z) * 0.026;
    } else if (this.variant === "blackhole") {
      const rad = Math.sqrt(x * x + y * y + z * z) + 0.001;
      const pull = (0.03 + bassPush * 0.02) / rad;
      p.velocity.x += -x * pull + -y * 0.006;
      p.velocity.y += -y * pull + x * 0.006;
      p.velocity.z += -z * pull;
    } else if (this.variant === "plasma") {
      const tx = Math.sin(y * 1.4 + t * (1.6 + midPush * 0.25)) * (1.1 + bassPush * 0.5);
      const ty = Math.cos(x * 1.3 - t * 1.5) * (1.1 + bassPush * 0.5);
      const tz = Math.sin((x + y) * 1.1 + t * 1.1) * (0.8 + flutter * 0.3);
      p.velocity.x += (tx - x) * 0.022;
      p.velocity.y += (ty - y) * 0.022;
      p.velocity.z += (tz - z) * 0.022;
    }

    p.velocity.x += randomRange(-0.03, 0.03) * (flutter + midPush * 0.2) * chaos;
    p.velocity.y += randomRange(-0.03, 0.03) * (flutter + midPush * 0.2) * chaos;
    p.velocity.z += randomRange(-0.01, 0.01);
    // Dampen more aggressively during silence so loud passages feel explosive.
    p.velocity.multiplyScalar(0.972 + bassPush * 0.01);

    this.positions[i3] += p.velocity.x * dt * bassPush;
    this.positions[i3 + 1] += p.velocity.y * dt * bassPush;
    this.positions[i3 + 2] += p.velocity.z * dt;
  }

  update(audio: AudioFeatures, events: SystemEvents, dt: number, chaos: number): void {
    // Drop the fixed floor so silence = minimal motion, loud bass = full drive.
    const bassPush = audio.bass * 2.0;
    const midPush = audio.mid * 1.6;
    const flutter = audio.high * 1.8;

    for (let i = 0; i < this.particles.length; i += 1) {
      const i3 = i * 3;
      this.updateVariant(i3, i, dt, bassPush, midPush, flutter, chaos);

      if (Math.abs(this.positions[i3]) > 4) this.positions[i3] *= -0.8;
      if (Math.abs(this.positions[i3 + 1]) > 3) this.positions[i3 + 1] *= -0.8;
      if (Math.abs(this.positions[i3 + 2]) > 2.5) this.positions[i3 + 2] *= -0.8;
    }

    if (events.beat) {
      // Hard impulse: kick every particle outward on beat.
      for (let i = 0; i < this.particles.length; i += 1) {
        const p = this.particles[i];
        const i3 = i * 3;
        const nx = this.positions[i3] * 0.3 + randomRange(-0.15, 0.15);
        const ny = this.positions[i3 + 1] * 0.3 + randomRange(-0.15, 0.15);
        p.velocity.x += nx * (0.6 + audio.bass * 1.2);
        p.velocity.y += ny * (0.6 + audio.bass * 1.2);
        p.velocity.z += randomRange(-0.2, 0.2) * (0.5 + audio.bass);
      }
      this.material.size = clamp(this.material.size + 0.028, 0.018, 0.12);
      this.life = clamp(this.life + 0.12, 0, 1);
    } else {
      this.material.size = clamp(this.material.size * 0.988, 0.018, 0.12);
      this.life -= dt * 0.018;
    }

    this.material.opacity = clamp(0.18 + this.life * 0.75 + audio.mid * 0.25, 0, 1);
    this.geometry.attributes.position.needsUpdate = true;

    if (this.life <= 0.02) {
      this.dead = true;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
