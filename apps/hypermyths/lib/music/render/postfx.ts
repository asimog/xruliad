import * as THREE from "three";
// Three.js postprocessing — JS-only modules, typed via any wrappers below
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
// @ts-ignore
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
// @ts-ignore
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
// @ts-ignore
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// Thin typed wrapper so the rest of the codebase stays strict.
type Composer = { render(): void; setSize(w: number, h: number): void };
type BloomPass = { strength: number; radius: number; threshold: number };

export class PostFx {
  private readonly composer: Composer;
  private readonly bloom: BloomPass;

  // Latch holds the bloom surge for a few frames after a beat hit.
  private beatLatch = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
  ) {
    // Configure renderer for HDR-style pipeline expected by bloom
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    this.composer = new EffectComposer(renderer) as Composer;
    (this.composer as unknown as { addPass(p: unknown): void }).addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.1,   // initial strength
      0.55,  // radius — wider spread = softer glow
      0.06,  // threshold — low so even mid-bright pixels bloom
    ) as BloomPass;
    (this.composer as unknown as { addPass(p: unknown): void }).addPass(this.bloom);
    (this.composer as unknown as { addPass(p: unknown): void }).addPass(new OutputPass());
  }

  /** Call once per frame before render(), passing current audio energy and beat state. */
  update(bass: number, beat: boolean): void {
    if (beat) {
      // Snap latch to full on every detected beat
      this.beatLatch = 1.0;
    }
    // Exponential decay — roughly 200 ms half-life at 60 fps
    this.beatLatch *= 0.88;

    // Bloom strength: baseline driven by bass, spiked by beat latch
    this.bloom.strength = 0.7 + bass * 1.6 + this.beatLatch * 1.8;
    // Bloom radius grows slightly with beat energy for a softer bloom burst
    this.bloom.radius = 0.45 + bass * 0.35 + this.beatLatch * 0.2;
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  render(): void {
    this.composer.render();
  }
}
