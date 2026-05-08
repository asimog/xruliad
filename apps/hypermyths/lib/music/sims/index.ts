/**
 * Registry of all raw .js simulations from the three.js sims collection.
 * Uses dynamic imports so Next.js bundles them correctly with Three.js deduplication.
 */

import * as THREE from "three";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SwarmCtor = new (container: HTMLElement, count: number) => any;

export interface SimEntry {
  id: string;
  name: string;
  /** Async function that returns the ParticlesSwarm constructor */
  loadCtor: () => Promise<SwarmCtor>;
  particleCount: number;
  description: string;
  category: SimCategory;
}

export type SimCategory =
  | "atomic"
  | "cosmic"
  | "4d"
  | "toroidal"
  | "organic"
  | "geometric"
  | "physics"
  | "abstract"
  | "ml"
  | "fire";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimModule = any;

const SIM_DEFS: {
  id: string;
  name: string;
  loader: () => Promise<SimModule>;
  particleCount: number;
  description: string;
  category: SimCategory;
}[] = [
  {
    id: "koratom",
    name: "Bohr Atom",
    loader: () => import("./koratom.js"),
    particleCount: 8000,
    description: "Classic atomic model with orbital rings",
    category: "atomic",
  },
  {
    id: "koratom_2",
    name: "KorFlow Atom",
    loader: () => import("./koratom_2.js"),
    particleCount: 8000,
    description: "Atom with golden-angle nucleus",
    category: "atomic",
  },
  {
    id: "koratom_3",
    name: "Atom with Electron Trails",
    loader: () => import("./koratom_3.js"),
    particleCount: 8000,
    description: "Atomic orbits with fading electron trails",
    category: "atomic",
  },
  {
    id: "koratom_7",
    name: "Electrons on Rings",
    loader: () => import("./koratom_7.js"),
    particleCount: 8000,
    description: "Dense electron heads orbiting on rings",
    category: "atomic",
  },
  {
    id: "koratom_9",
    name: "20-Sphere Nucleus",
    loader: () => import("./koratom_9.js"),
    particleCount: 8000,
    description: "Multi-sphere nucleus with electron heads",
    category: "atomic",
  },
  {
    id: "koratom_10",
    name: "24-Sphere Nucleus",
    loader: () => import("./koratom_10.js"),
    particleCount: 8000,
    description: "Tighter nucleus with 24 spheres",
    category: "atomic",
  },
  {
    id: "galaxies",
    name: "Binary Galaxy Collision",
    loader: () => import("./galaxies.js"),
    particleCount: 10000,
    description: "Two spiral galaxies in gravitational interaction",
    category: "cosmic",
  },
  {
    id: "massive_black_hole",
    name: "Quasar Engine",
    loader: () => import("./massive_black_hole.js"),
    particleCount: 8000,
    description: "Black hole with accretion disk and relativistic jets",
    category: "cosmic",
  },
  {
    id: "tesseract_xd",
    name: "4D Clifford Torus",
    loader: () => import("./tesseract_xd.js"),
    particleCount: 8000,
    description: "Breathing 4D torus folding through 3D",
    category: "4d",
  },
  {
    id: "unicorn",
    name: "Breathing Tesseract",
    loader: () => import("./unicorn.js"),
    particleCount: 6000,
    description: "4D hypercube with isoclinic rotation",
    category: "4d",
  },
  {
    id: "copilot___ssm01",
    name: "4D Tesseract Swarm",
    loader: () => import("./copilot___ssm01.js"),
    particleCount: 6000,
    description: "Breathing 4D hypercube with twist",
    category: "4d",
  },
  {
    id: "testing55555",
    name: "4D Tesseract Breath",
    loader: () => import("./testing55555.js"),
    particleCount: 6000,
    description: "4D hypercube breathing in w-dimension",
    category: "4d",
  },
  {
    id: "torus",
    name: "Parametric Torus",
    loader: () => import("./torus.js"),
    particleCount: 6000,
    description: "Static mathematical torus surface",
    category: "toroidal",
  },
  {
    id: "torus_swarm",
    name: "Breathing Torus Swarm",
    loader: () => import("./torus_swarm.js"),
    particleCount: 8000,
    description: "Double-helix torus with precession",
    category: "toroidal",
  },
  {
    id: "orbital_torus_knots",
    name: "Orbital Torus Knots",
    loader: () => import("./orbital_torus_knots.js"),
    particleCount: 8000,
    description: "Multi-ringed torus knot morphing",
    category: "toroidal",
  },
  {
    id: "jelly__fish",
    name: "Bioluminescent Jelly",
    loader: () => import("./jelly__fish.js"),
    particleCount: 8000,
    description: "Pulsing jellyfish bell with tentacle flow",
    category: "organic",
  },
  {
    id: "neural_network",
    name: "Neural Particle Network",
    loader: () => import("./neural_network.js"),
    particleCount: 6000,
    description: "Spherical Fibonacci with wave distortion",
    category: "organic",
  },
  {
    id: "golden_ratio",
    name: "Fibonacci Phyllotaxis",
    loader: () => import("./golden_ratio.js"),
    particleCount: 8000,
    description: "Golden angle spherical distribution",
    category: "geometric",
  },
  {
    id: "sphere",
    name: "Fibonacci Sphere",
    loader: () => import("./sphere.js"),
    particleCount: 5000,
    description: "Static Fibonacci sphere",
    category: "geometric",
  },
  {
    id: "cube",
    name: "Point Cloud Cube",
    loader: () => import("./cube.js"),
    particleCount: 5000,
    description: "3D grid point cloud",
    category: "geometric",
  },
  {
    id: "helix",
    name: "DNA Helix",
    loader: () => import("./helix.js"),
    particleCount: 5000,
    description: "DNA double helix",
    category: "geometric",
  },
  {
    id: "s7777",
    name: "Text to DNA Morph",
    loader: () => import("./s7777.js"),
    particleCount: 8000,
    description: "Particle morph from text to DNA helix",
    category: "geometric",
  },
  {
    id: "kelvin_helmholtz_plasma_jets",
    name: "Kelvin-Helmholtz Plasma",
    loader: () => import("./kelvin_helmholtz_plasma_jets.js"),
    particleCount: 10000,
    description: "Counter-rotating plasma jets with KH vortex",
    category: "physics",
  },
  {
    id: "majii",
    name: "Ocean Gerstner Waves",
    loader: () => import("./majii.js"),
    particleCount: 8000,
    description: "Overlapping Gerstner wave trains with foam",
    category: "physics",
  },
  {
    id: "support_vector_machine",
    name: "SVM Boundary",
    loader: () => import("./support_vector_machine.js"),
    particleCount: 6000,
    description: "ML decision boundary visualization",
    category: "ml",
  },
  {
    id: "disco",
    name: "Retro Disco Ball",
    loader: () => import("./disco.js"),
    particleCount: 6000,
    description: "Mirror tile sphere with rotating spotlights",
    category: "abstract",
  },
  {
    id: "mr__kuramoto",
    name: "OMUO Genesis Lattice",
    loader: () => import("./mr__kuramoto.js"),
    particleCount: 6000,
    description: "E8-inspired polytope lattice",
    category: "abstract",
  },
  {
    id: "mobius_infinite_loop",
    name: "Mobius Ribbon",
    loader: () => import("./mobius_infinite_loop.js"),
    particleCount: 8000,
    description: "Figure-8 Mobius strip with chromatic flow",
    category: "abstract",
  },
  {
    id: "dog2",
    name: "Hyper-Dog 4D",
    loader: () => import("./dog2.js"),
    particleCount: 6000,
    description: "4D biological entity with breathing",
    category: "abstract",
  },
  {
    id: "kh_m",
    name: "Mosaic Evolution",
    loader: () => import("./kh_m.js"),
    particleCount: 6000,
    description: "Volumetric tessellation with shatter",
    category: "abstract",
  },
  {
    id: "sa",
    name: "Quantum Flux Sphere",
    loader: () => import("./sa.js"),
    particleCount: 6000,
    description: "Breathing wave deformation sphere",
    category: "abstract",
  },
  {
    id: "wawawaa",
    name: "Hyper-Tesseract Breath",
    loader: () => import("./wawawaa.js"),
    particleCount: 6000,
    description: "Golden sphere with 4D rotation",
    category: "abstract",
  },
  {
    id: "x",
    name: "Quantum Chrysalis",
    loader: () => import("./x.js"),
    particleCount: 6000,
    description: "Golden sphere with harmonic interference",
    category: "abstract",
  },
  {
    id: "god_acc_to_copilot",
    name: "Source Intelligence",
    loader: () => import("./god_acc_to_copilot.js"),
    particleCount: 6000,
    description: "Spherical energy tendrils",
    category: "abstract",
  },
  {
    id: "s31313113",
    name: "Quantum Toroidal Attractor",
    loader: () => import("./31313113.js"),
    particleCount: 6000,
    description: "Torus with harmonic twist",
    category: "abstract",
  },
  {
    id: "s3131311322",
    name: "Phyllotaxis Rose",
    loader: () => import("./3131311322.js"),
    particleCount: 6000,
    description: "Vogel's model spiral with petals",
    category: "abstract",
  },
  {
    id: "chair",
    name: "The Minimalist Chair",
    loader: () => import("./chair.js"),
    particleCount: 5000,
    description: "Point cloud chair geometry",
    category: "abstract",
  },
  {
    id: "_____",
    name: "Layered Fire Wall",
    loader: () => import("./_____.js"),
    particleCount: 8000,
    description: "Multi-layered fire simulation",
    category: "fire",
  },
];

// Cache for loaded constructors
const ctorCache = new Map<string, SwarmCtor>();

function buildEntry(def: (typeof SIM_DEFS)[number]): SimEntry {
  return {
    id: def.id,
    name: def.name,
    particleCount: def.particleCount,
    description: def.description,
    category: def.category,
    loadCtor: async () => {
      const cached = ctorCache.get(def.id);
      if (cached) return cached;
      const mod = await def.loader();
      const ctor = mod.ParticlesSwarm as SwarmCtor;
      if (!ctor)
        throw new Error(`Module ${def.id} does not export ParticlesSwarm`);
      ctorCache.set(def.id, ctor);
      return ctor;
    },
  };
}

/** Get all sim entries */
export function getSimEntries(): SimEntry[] {
  return SIM_DEFS.map(buildEntry);
}

/** Get a sim entry by ID */
export function getSimEntry(id: string): SimEntry | undefined {
  const def = SIM_DEFS.find((s) => s.id === id);
  if (!def) return undefined;
  return buildEntry(def);
}

/** Get sims by category */
export function getSimsByCategory(category: SimCategory): SimEntry[] {
  return SIM_DEFS.filter((s) => s.category === category).map(buildEntry);
}

/** Get a random sim */
export function getRandomSim(): SimEntry {
  const def = SIM_DEFS[Math.floor(Math.random() * SIM_DEFS.length)];
  return buildEntry(def);
}

/** Get all sim IDs */
export function getSimIds(): string[] {
  return SIM_DEFS.map((s) => s.id);
}

/** Preload a specific sim module */
export async function preloadSim(id: string): Promise<SwarmCtor> {
  const entry = getSimEntry(id);
  if (!entry) throw new Error(`Unknown sim: ${id}`);
  return entry.loadCtor();
}

/** Preload all sim modules */
export async function preloadAllSims(): Promise<void> {
  await Promise.all(SIM_DEFS.map((def) => buildEntry(def).loadCtor()));
}
