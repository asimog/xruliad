import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type {
  GenerativeSystem,
  SystemEvents,
} from "@/lib/music/generative/system-types";

/**
 * SimRunner — wraps a raw .js ParticlesSwarm sim and makes it audio-reactive
 * within the HyperMyths rendering pipeline.
 *
 * Architecture:
 *   1. Instantiate the sim in a fake container, steal its mesh into HyperMyths' scene
 *   2. Kill the sim's own rAF loop + composer + renderer
 *   3. Extract the animate function source, compile it into a callable function
 *   4. Each update(): run the compiled function with audio-reactive addControl
 *   5. HyperMyths' renderer + postfx renders the mesh with audio-reactive bloom
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySwarm = any;

export class SimRunner implements GenerativeSystem {
  type = "particles" as const;
  dead = false;

  object: THREE.InstancedMesh;

  private readonly mesh: THREE.InstancedMesh;
  private readonly positions: THREE.Vector3[];
  private readonly clock: THREE.Clock;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly target = new THREE.Vector3();
  private readonly pColor = new THREE.Color();
  private readonly count: number;

  // Compiled animate function
  private readonly runFrame:
    | ((
        time: number,
        count: number,
        positions: THREE.Vector3[],
        dummy: THREE.Object3D,
        color: THREE.Color,
        target: THREE.Vector3,
        pColor: THREE.Color,
        mesh: THREE.InstancedMesh,
        addControl: (
          id: string,
          label: string,
          min: number,
          max: number,
          val: number,
        ) => number,
        setInfo: () => void,
        annotate: () => void,
        THREE_LIB: typeof THREE,
        speedMult: number,
      ) => void)
    | null;

  /** Cached default params extracted from the first frame */
  private cachedDefaults: Record<string, number> = {};

  constructor(scene: THREE.Scene, simModule: AnySwarm, count: number) {
    this.count = count;
    this.clock = new THREE.Clock();

    // 1. Create sim in a fake offscreen container
    const fakeContainer = document.createElement("div");
    fakeContainer.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(fakeContainer);

    const raw = new simModule(fakeContainer, count);

    this.mesh = raw.mesh;
    this.positions = raw.positions;
    this.object = this.mesh;

    // 2. Extract and compile the animate body
    const animateSource = raw.animate.toString();
    const animateBody = this.extractAnimateBody(animateSource);
    this.runFrame = this.compileAnimateBody(animateBody);

    // 3. Move mesh to HyperMyths scene
    raw.scene.remove(this.mesh);
    scene.add(this.mesh);

    // 4. Kill the sim's own rAF + composer + renderer
    raw.animate = () => {};
    raw.composer.render = () => {};
    raw.renderer.dispose();
    fakeContainer.remove();
  }

  /**
   * Extract the body of the animate function — the code between
   * `const PARAMS` and `this.composer.render()`.
   */
  private extractAnimateBody(source: string): string | null {
    const paramsIdx = source.indexOf("const PARAMS");
    const composerIdx = source.lastIndexOf("this.composer.render()");

    if (paramsIdx === -1 || composerIdx === -1) {
      return null;
    }

    let body = source.substring(paramsIdx, composerIdx);

    // Replace `this.xxx` references with plain variable names
    body = body
      .replace(/this\.count\b/g, "count")
      .replace(/this\.target\b/g, "target")
      .replace(/this\.pColor\b/g, "pColor")
      .replace(/this\.color\b/g, "color")
      .replace(/this\.positions\b/g, "positions")
      .replace(/this\.dummy\b/g, "dummy")
      .replace(/this\.mesh\b/g, "mesh")
      .replace(/this\.clock\b/g, "/* clock */")
      .replace(/this\.speedMult\b/g, "speedMult");

    // Remove the `const count = this.count` line
    body = body.replace(/const count = this\.count;\s*\/\/?.*\n?/, "");
    // Remove `let THREE_LIB = THREE;` duplicates
    body = body.replace(/let THREE_LIB = THREE;\s*/g, "");

    return body;
  }

  /**
   * Compile the animate body into a callable function.
   */
  private compileAnimateBody(body: string | null) {
    if (!body) return null;

    try {
      const fn = new Function(
        "time",
        "count",
        "positions",
        "dummy",
        "color",
        "target",
        "pColor",
        "mesh",
        "addControl",
        "setInfo",
        "annotate",
        "THREE_LIB",
        "speedMult",
        body,
      );
      return fn as typeof this.runFrame extends null
        ? never
        : typeof this.runFrame;
    } catch {
      return null;
    }
  }

  /**
   * Build audio-reactive parameter values from cached defaults.
   */
  private createAudioReactiveParams(
    audio: AudioFeatures,
    events: SystemEvents,
    chaos: number,
    defaults: Record<string, number>,
  ): Record<string, number> {
    const bass = audio.bass;
    const mid = audio.mid;
    const high = audio.high;
    const beat = events.beat ? 1 : 0;
    const result: Record<string, number> = {};

    for (const key of Object.keys(defaults)) {
      const lower = key.toLowerCase();
      const base = defaults[key];

      if (lower.includes("speed") && !lower.includes("time")) {
        result[key] = base * (0.4 + bass * 1.8 + beat * 0.8);
      } else if (
        lower.includes("scale") ||
        lower.includes("radius") ||
        lower.includes("spread")
      ) {
        result[key] = base * (0.7 + bass * 0.5 + mid * 0.6);
      } else if (lower.includes("chaos") || lower.includes("noise")) {
        result[key] = Math.min(1, base + chaos * 0.6 + high * 0.3);
      } else if (
        lower.includes("flow") ||
        lower.includes("twist") ||
        lower.includes("pulse")
      ) {
        result[key] = base * (0.6 + mid * 1.2 + high * 0.5);
      } else if (
        lower.includes("mass") ||
        lower.includes("gravity") ||
        lower.includes("jet") ||
        lower.includes("pull")
      ) {
        result[key] = base * (0.8 + bass * 2.0 + beat * 1.2);
      } else if (lower.includes("hue") || lower.includes("color")) {
        result[key] = (((base + bass * 0.12 + high * 0.08) % 1.0) + 1.0) % 1.0;
      } else if (
        lower.includes("morph") ||
        lower.includes("breathe") ||
        lower.includes("breath")
      ) {
        result[key] = base * (0.5 + bass * 1.8 + mid * 0.5);
      } else if (lower.includes("complexity")) {
        result[key] = base * (0.8 + chaos * 0.7 + high * 0.4);
      } else if (lower.includes("thick")) {
        result[key] = base * (0.7 + bass * 0.8);
      } else if (
        lower.includes("margin") ||
        lower.includes("kernel") ||
        lower.includes("support")
      ) {
        result[key] = base * (0.7 + mid * 0.9 + beat * 0.5);
      } else if (lower.includes("rotate") || lower.includes("rot")) {
        result[key] = base * (0.5 + bass * 1.3 + high * 0.4);
      } else if (lower.includes("wave")) {
        result[key] = base * (0.6 + mid * 1.1 + bass * 0.5);
      } else if (lower.includes("storm") || lower.includes("chop")) {
        result[key] = base * (0.7 + bass * 2.2 + beat * 1.3);
      } else if (lower.includes("depth")) {
        result[key] = base * (0.8 + bass * 0.6);
      } else if (lower.includes("bind")) {
        result[key] = base * (0.6 + mid * 0.9);
      } else if (
        lower.includes("separation") ||
        lower.includes("width") ||
        lower.includes("height")
      ) {
        result[key] = base * (0.85 + mid * 0.3);
      } else if (lower.includes("tile")) {
        result[key] = Math.max(1, Math.round(base * (0.7 + bass * 0.6)));
      } else if (lower.includes("beam")) {
        result[key] = Math.max(1, Math.round(base * (0.6 + high * 0.8)));
      } else if (lower.includes("expansion")) {
        result[key] = base * (0.6 + bass * 1.3);
      } else if (lower.includes("spin")) {
        result[key] = base * (0.5 + bass * 1.1 + high * 0.3);
      } else if (lower.includes("petal") || lower.includes("density")) {
        result[key] = Math.max(
          1,
          Math.round(base * (0.8 + mid * 0.5 + bass * 0.3)),
        );
      } else if (lower.includes("growth")) {
        result[key] = base * (0.7 + bass * 0.9 + mid * 0.3);
      } else if (lower.includes("shatter")) {
        result[key] = base * (0.5 + bass * 1.6 + beat * 0.9);
      } else if (lower.includes("res")) {
        result[key] = Math.max(1, Math.round(base * (0.8 + chaos * 0.4)));
      } else if (lower.includes("amplitude")) {
        result[key] = base * (0.6 + bass * 1.5 + beat * 0.7);
      } else if (lower.includes("drift")) {
        result[key] = base * (0.7 + high * 0.8);
      } else if (lower.includes("bias")) {
        result[key] = base + bass * 0.2 - 0.1;
      } else if (lower.includes("tube")) {
        result[key] = base * (0.8 + bass * 0.6);
      } else if (lower.includes("billow")) {
        result[key] = Math.max(1, Math.round(base * (0.8 + mid * 0.5)));
      } else if (lower.includes("shear")) {
        result[key] = base * (0.6 + bass * 1.4 + beat * 0.5);
      } else if (lower.includes("reconnect")) {
        result[key] = base * (0.7 + bass * 1.8 + beat * 1.0);
      } else if (lower.includes("alfven")) {
        result[key] = base * (0.8 + mid * 0.7 + high * 0.3);
      } else if (lower.includes("hyper") || lower.includes("wcam")) {
        result[key] = base * (0.6 + bass * 1.2 + mid * 0.4);
      } else if (lower.includes("tentacle")) {
        result[key] = base * (0.7 + mid * 0.9 + high * 0.3);
      } else if (lower.includes("shell")) {
        result[key] = base * (0.8 + bass * 0.5);
      } else if (lower.includes("rings")) {
        result[key] = Math.max(1, Math.round(base * (0.7 + mid * 0.6)));
      } else if (lower.includes("nucleus")) {
        result[key] = base * (0.8 + bass * 0.4);
      } else if (lower.includes("trail")) {
        result[key] = base * (0.7 + high * 0.6);
      } else if (lower.includes("persp")) {
        result[key] = base * (0.8 + bass * 0.5);
      } else if (lower.includes("colorshift")) {
        result[key] = base * (0.6 + high * 0.9);
      } else {
        result[key] = base;
      }
    }

    return result;
  }

  update(
    audio: AudioFeatures,
    events: SystemEvents,
    dt: number,
    chaos: number,
  ): void {
    if (!this.runFrame) return;

    const time = this.clock.getElapsedTime();
    const speedMult = 0.4 + audio.bass * 1.8 + (events.beat ? 0.8 : 0);
    const effectiveTime = time * speedMult;

    // First frame: record defaults
    if (Object.keys(this.cachedDefaults).length === 0) {
      const firstFrameDefaults: Record<string, number> = {};
      const recordingAddControl = (
        id: string,
        _label: string,
        _min: number,
        _max: number,
        val: number,
      ): number => {
        firstFrameDefaults[id] = val;
        return val;
      };

      try {
        this.runFrame(
          effectiveTime,
          this.count,
          this.positions,
          this.dummy,
          this.color,
          this.target,
          this.pColor,
          this.mesh,
          recordingAddControl,
          () => {},
          () => {},
          THREE,
          speedMult,
        );
        this.cachedDefaults = firstFrameDefaults;
      } catch {
        // If first frame fails, fall back to passthrough
      }

      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) {
        this.mesh.instanceColor.needsUpdate = true;
      }
      return;
    }

    // Subsequent frames: use cached defaults for audio reactivity
    const audioReactive = this.createAudioReactiveParams(
      audio,
      events,
      chaos,
      this.cachedDefaults,
    );

    const addControl = (
      id: string,
      _label: string,
      _min: number,
      _max: number,
      val: number,
    ): number => {
      return audioReactive[id] ?? val;
    };

    try {
      this.runFrame(
        effectiveTime,
        this.count,
        this.positions,
        this.dummy,
        this.color,
        this.target,
        this.pColor,
        this.mesh,
        addControl,
        () => {},
        () => {},
        THREE,
        speedMult,
      );

      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) {
        this.mesh.instanceColor.needsUpdate = true;
      }
    } catch {
      // Silently fail — sim stays on last frame
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
