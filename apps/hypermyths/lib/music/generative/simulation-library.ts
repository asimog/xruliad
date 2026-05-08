export type SimulationEntry = {
  id: string;
  name: string;
  physics: string;
  description: string;
  seedTag: string;
  prompt: string;
  motionFamily: MotionFamily;
  sourceFile?: string;
};

export type MotionFamily =
  | "rain"
  | "orbit"
  | "torus"
  | "helix"
  | "lattice"
  | "sphere"
  | "galaxy"
  | "vortex"
  | "kuramoto"
  | "mobius"
  | "tesseract"
  | "blackhole"
  | "swarm"
  | "plasma";
const EXTERNAL_SIM_FILES = [
  "31313113.js",
  "3131311322.js",
  "_____.js",
  "chair.js",
  "claude_panel.js",
  "copilot___ssm01.js",
  "cube.js",
  "disco.js",
  "dog2.js",
  "galaxies.js",
  "god_acc_to_copilot.js",
  "golden_ratio.js",
  "helix.js",
  "jelly__fish.js",
  "kelvin_helmholtz_plasma_jets.js",
  "kh_m.js",
  "koratom.js",
  "koratom_10.js",
  "koratom_2.js",
  "koratom_3.js",
  "koratom_7.js",
  "koratom_9.js",
  "majii.js",
  "massive_black_hole.js",
  "mobius_infinite_loop.js",
  "mr__kuramoto.js",
  "neural_network.js",
  "orbital_torus_knots.js",
  "s7777.js",
  "sa.js",
  "sphere.js",
  "support_vector_machine.js",
  "tesseract_xd.js",
  "testing55555.js",
  "torus.js",
  "torus_swarm.js",
  "unicorn.js",
  "wawawaa.js",
  "x.js",
] as const;

function prettyLabelFromFile(file: string): string {
  const stem = file.replace(/\.js$/i, "");
  const normalized = stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Simulation";
  return normalized
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function deriveMotionFamily(id: string): MotionFamily {
  const value = id.toLowerCase();
  if (value.includes("torus")) return "torus";
  if (value.includes("helix")) return "helix";
  if (value.includes("sphere")) return "sphere";
  if (value.includes("cube") || value.includes("panel") || value.includes("chair")) return "lattice";
  if (value.includes("galax") || value.includes("unicorn")) return "galaxy";
  if (value.includes("vortex") || value.includes("kh") || value.includes("jelly")) return "vortex";
  if (value.includes("kuramoto")) return "kuramoto";
  if (value.includes("mobius")) return "mobius";
  if (value.includes("tesseract") || value.includes("x")) return "tesseract";
  if (value.includes("black_hole") || value.includes("black")) return "blackhole";
  if (value.includes("disco") || value.includes("plasma") || value.includes("waw")) return "plasma";
  return "swarm";
}

function physicsForFamily(family: MotionFamily): string {
  switch (family) {
    case "torus":
      return "Toroidal attractor loops with nested ring harmonics.";
    case "helix":
      return "Parametric helix advection with phase-coupled torsion.";
    case "lattice":
      return "Quantized grid snapping and structured lattice relaxation.";
    case "sphere":
      return "Spherical shell breathing with radial interference terms.";
    case "galaxy":
      return "Spiral-arm orbital drift with centripetal pull.";
    case "vortex":
      return "Vortical curl flow with rotating shear layers.";
    case "kuramoto":
      return "Coupled oscillator synchronization and phase locking.";
    case "mobius":
      return "Möbius strip coordinate mapping with twisted continuity.";
    case "tesseract":
      return "4D projection dynamics with rotating hyperplane transforms.";
    case "blackhole":
      return "Inverse-distance gravity well and angular momentum spiral.";
    case "plasma":
      return "Plasma turbulence with pulse-modulated ion drift.";
    default:
      return "Swarm particle field with stochastic-adaptive advection.";
  }
}

function descriptionForFamily(family: MotionFamily): string {
  switch (family) {
    case "torus":
      return "Dense ring volumes fold into breathing toroidal knots.";
    case "helix":
      return "Braided strands climb and twist through audio pressure waves.";
    case "lattice":
      return "Rigid geometric scaffolds pulse and reconfigure on beat events.";
    case "sphere":
      return "Orbital shells inflate and collapse around a central core.";
    case "galaxy":
      return "Rotating starfield arms scatter and recenter in long arcs.";
    case "vortex":
      return "Fluid swirls spin into layered vortices with sharp roll-ups.";
    case "kuramoto":
      return "Oscillator clusters phase-align then decohere under transients.";
    case "mobius":
      return "A single twisted surface path recycles particles continuously.";
    case "tesseract":
      return "Hyperdimensional folds cast moving 3D shadows of 4D motion.";
    case "blackhole":
      return "Matter streams into singular wells before burst-like release.";
    case "plasma":
      return "Ionized strands arc and flash with energetic turbulence.";
    default:
      return "Free-form swarm choreography with nonlinear reaction patterns.";
  }
}

function promptFor(file: string, name: string, family: MotionFamily): string {
  return `Integrate ${name} from ${file} as a distinct audio-reactive simulation using ${physicsForFamily(
    family,
  )} Keep visuals mathematically coherent, dark-background ready, and strongly responsive to bass/mid/high bands.`;
}

function buildExternalSimulation(file: string): SimulationEntry {
  const id = file.replace(/\.js$/i, "");
  const family = deriveMotionFamily(id);
  const name = prettyLabelFromFile(file);
  return {
    id,
    name,
    physics: physicsForFamily(family),
    description: descriptionForFamily(family),
    seedTag: id,
    prompt: promptFor(file, name, family),
    motionFamily: family,
    sourceFile: file,
  };
}

const ADDITIONAL_SIMULATIONS: SimulationEntry[] = [
  {
    id: "hyperbolic-resonance-field",
    name: "Hyperbolic Resonance Field",
    physics: "Hyperbolic attractor geometry with frequency-coupled radial tension.",
    description: "Deep-space resonance cones flexing under low-frequency pressure.",
    seedTag: "hyperbolic-resonance-field",
    prompt:
      "Create a hyperbolic resonance simulation with phase-shifted concentric layers and strong bass-driven radial expansion.",
    motionFamily: "vortex",
  },
  {
    id: "reaction-diffusion-prism",
    name: "Reaction Diffusion Prism",
    physics: "Discrete reaction-diffusion patches with prismatic flow constraints.",
    description: "Cellular plume patterns splitting into chromatic diffusion fronts.",
    seedTag: "reaction-diffusion-prism",
    prompt:
      "Generate a reaction-diffusion inspired particle prism that expands, self-organizes, and re-seeds with onset spikes.",
    motionFamily: "plasma",
  },
  {
    id: "strange-attractor-cathedral",
    name: "Strange Attractor Cathedral",
    physics: "Lorenz-like attractor wandering with vaulted harmonic envelopes.",
    description: "Chaotic but bounded attractor arches with synchronized pulse gates.",
    seedTag: "strange-attractor-cathedral",
    prompt:
      "Design a cathedral-scale strange-attractor field with layered chaotic loops and emergent symmetry under rhythm locking.",
    motionFamily: "swarm",
  },
];

const BUILTIN = EXTERNAL_SIM_FILES.map((file) => buildExternalSimulation(file));
export const BUILTIN_SIMULATIONS: SimulationEntry[] = [
  ...BUILTIN,
  ...ADDITIONAL_SIMULATIONS,
];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "sim";
}

export function normalizeSimulationEntry(input: Partial<SimulationEntry>, index = 0): SimulationEntry {
  const name = (input.name ?? "Simulation").trim() || "Simulation";
  const idBase = input.id ?? slugify(name);
  const id = idBase.trim() || `sim-${index}`;
  return {
    id,
    name,
    physics: (input.physics ?? "Particle field dynamics.").trim(),
    description: (input.description ?? "Audio-reactive particle simulation.").trim(),
    seedTag: (input.seedTag ?? `${id}-seed`).trim() || `${id}-seed`,
    prompt:
      (input.prompt ?? "Design a unique audio-reactive simulation with distinct motion rules.").trim(),
    motionFamily: (input.motionFamily ?? "swarm") as MotionFamily,
    sourceFile: input.sourceFile?.trim(),
  };
}

export function buildSimulationLibrary(external: Partial<SimulationEntry>[] = []): SimulationEntry[] {
  const parsedExternal = external.map((entry, i) => normalizeSimulationEntry(entry, i));
  const merged = [...BUILTIN_SIMULATIONS, ...parsedExternal];

  const dedup = new Map<string, SimulationEntry>();
  for (const sim of merged) {
    if (!dedup.has(sim.id)) dedup.set(sim.id, sim);
  }

  return [...dedup.values()];
}

export function getSimulationById(id: string, library: SimulationEntry[] = BUILTIN_SIMULATIONS): SimulationEntry | undefined {
  return library.find((sim) => sim.id === id);
}
