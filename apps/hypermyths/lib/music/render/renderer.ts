import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import { createCamera, resizeCamera } from "@/lib/music/render/camera";
import { PostFx } from "@/lib/music/render/postfx";
import { createScene } from "@/lib/music/render/scene";

export class Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  private readonly postFx: PostFx;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    this.scene = createScene();
    this.camera = createCamera(width, height);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);

    // PostFx must be created after renderer/scene/camera are ready
    this.postFx = new PostFx(this.renderer, this.scene, this.camera, width, height);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    resizeCamera(this.camera, width, height);
    this.postFx.resize(width, height);
  }

  render(audio: AudioFeatures, beat: boolean): void {
    this.postFx.update(audio.bass, beat);
    this.postFx.render();
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
