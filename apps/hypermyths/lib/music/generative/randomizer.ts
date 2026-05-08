import type { MotionFamily } from "@/lib/music/generative/simulation-library";
import type { SystemType } from "@/lib/music/generative/system-types";
import { seededRandom } from "@/lib/music/utils/seed";

export type ParticleVariant = MotionFamily;
export type BackgroundMode = 0 | 1 | 2;

export type VisualProfile = {
  id: string;
  name: string;
  backgroundMode: BackgroundMode;
  particleVariant: ParticleVariant;
  tintA: string;
  tintB: string;
  spawnWeights: Record<SystemType, number>;
  baseChaos: number;
  baseSpawnRate: number;
};

const PRESETS: Omit<VisualProfile, "id">[] = [
  // Casberry-style physics-inspired preset families:
  // orbit clusters, vortex rain, shard bursts, and grid pulse fields.
  {
    name: "Orbital Lattice",
    backgroundMode: 0,
    particleVariant: "orbit",
    tintA: "#38f0ff",
    tintB: "#1a2b55",
    spawnWeights: { particles: 0.55, boids: 0.25, fracture: 0.2, life: 0, fluid: 0 },
    baseChaos: 0.42,
    baseSpawnRate: 0.024,
  },
  {
    name: "Vortex Rain",
    backgroundMode: 1,
    particleVariant: "rain",
    tintA: "#2df7a4",
    tintB: "#071b3a",
    spawnWeights: { particles: 0.7, boids: 0.15, fracture: 0.15, life: 0, fluid: 0 },
    baseChaos: 0.62,
    baseSpawnRate: 0.03,
  },
  {
    name: "Plasma Shards",
    backgroundMode: 2,
    particleVariant: "helix",
    tintA: "#ff8d3b",
    tintB: "#180922",
    spawnWeights: { particles: 0.45, boids: 0.15, fracture: 0.4, life: 0, fluid: 0 },
    baseChaos: 0.7,
    baseSpawnRate: 0.034,
  },
  {
    name: "Grid Pulse",
    backgroundMode: 1,
    particleVariant: "lattice",
    tintA: "#96f0ff",
    tintB: "#11314f",
    spawnWeights: { particles: 0.5, boids: 0.35, fracture: 0.15, life: 0, fluid: 0 },
    baseChaos: 0.48,
    baseSpawnRate: 0.026,
  },
];

function resolveVariantFromSeed(seed: string): ParticleVariant {
  const value = seed.toLowerCase();
  if (value.includes("torus")) return "torus";
  if (value.includes("helix")) return "helix";
  if (value.includes("sphere")) return "sphere";
  if (value.includes("cube") || value.includes("panel") || value.includes("chair")) return "lattice";
  if (value.includes("galax") || value.includes("unicorn")) return "galaxy";
  if (value.includes("vortex") || value.includes("kh") || value.includes("jelly")) return "vortex";
  if (value.includes("kuramoto")) return "kuramoto";
  if (value.includes("mobius")) return "mobius";
  if (value.includes("tesseract")) return "tesseract";
  if (value.includes("black")) return "blackhole";
  if (value.includes("plasma") || value.includes("disco")) return "plasma";
  return "swarm";
}

function normalizeWeights(weights: Record<SystemType, number>): Record<SystemType, number> {
  const total = Object.values(weights).reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0) {
    return { particles: 1, boids: 0, fracture: 0, life: 0, fluid: 0 };
  }

  return {
    particles: weights.particles / total,
    boids: weights.boids / total,
    fracture: weights.fracture / total,
    life: weights.life / total,
    fluid: weights.fluid / total,
  };
}

export function profileFromSeed(
  seed: string,
  forcedVariant?: ParticleVariant,
): VisualProfile {
  const rand = seededRandom(seed);
  const base = PRESETS[Math.floor(rand() * PRESETS.length)];
  const particleVariant = forcedVariant ?? resolveVariantFromSeed(seed);

  const spawnWeightsByVariant: Record<ParticleVariant, Record<SystemType, number>> = {
    rain: { particles: 0.72, boids: 0.18, fracture: 0.1, life: 0, fluid: 0 },
    orbit: { particles: 0.68, boids: 0.22, fracture: 0.1, life: 0, fluid: 0 },
    torus: { particles: 0.72, boids: 0.18, fracture: 0.1, life: 0, fluid: 0 },
    helix: { particles: 0.66, boids: 0.24, fracture: 0.1, life: 0, fluid: 0 },
    lattice: { particles: 0.58, boids: 0.27, fracture: 0.15, life: 0, fluid: 0 },
    sphere: { particles: 0.7, boids: 0.2, fracture: 0.1, life: 0, fluid: 0 },
    galaxy: { particles: 0.73, boids: 0.17, fracture: 0.1, life: 0, fluid: 0 },
    vortex: { particles: 0.63, boids: 0.2, fracture: 0.17, life: 0, fluid: 0 },
    kuramoto: { particles: 0.67, boids: 0.21, fracture: 0.12, life: 0, fluid: 0 },
    mobius: { particles: 0.69, boids: 0.18, fracture: 0.13, life: 0, fluid: 0 },
    tesseract: { particles: 0.74, boids: 0.14, fracture: 0.12, life: 0, fluid: 0 },
    blackhole: { particles: 0.62, boids: 0.16, fracture: 0.22, life: 0, fluid: 0 },
    swarm: { particles: 0.68, boids: 0.2, fracture: 0.12, life: 0, fluid: 0 },
    plasma: { particles: 0.6, boids: 0.15, fracture: 0.25, life: 0, fluid: 0 },
  };

  return {
    ...base,
    id: seed,
    particleVariant,
    spawnWeights: normalizeWeights(
      spawnWeightsByVariant[particleVariant] ?? base.spawnWeights,
    ),
  };
}

export function randomProfile(randomSource: () => number = Math.random): VisualProfile {
  const seed = `${Date.now()}-${Math.floor(randomSource() * 1e9)}`;
  return profileFromSeed(seed);
}

export function pickSystemType(weights: Record<SystemType, number>, r: number): SystemType {
  const ordered: SystemType[] = ["particles", "boids", "fracture", "life", "fluid"];
  let cursor = 0;

  for (const type of ordered) {
    cursor += weights[type] ?? 0;
    if (r <= cursor) return type;
  }

  return "particles";
}
