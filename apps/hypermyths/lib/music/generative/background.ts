import * as THREE from "three";
import type { AudioFeatures } from "@/lib/music/audio/audio-engine";
import type { VisualProfile } from "@/lib/music/generative/randomizer";
import { profileFromSeed } from "@/lib/music/generative/randomizer";
import { backgroundFragmentShader } from "@/lib/music/render/shaders/background-fragment";
import { backgroundVertexShader } from "@/lib/music/render/shaders/background-vertex";

export class Background {
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;

  constructor(scene: THREE.Scene, width: number, height: number) {
    const initialProfile = profileFromSeed("music-default");

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uMode: { value: initialProfile.backgroundMode },
        uTintA: { value: new THREE.Color(initialProfile.tintA) },
        uTintB: { value: new THREE.Color(initialProfile.tintB) },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;

    scene.add(this.mesh);
  }

  setProfile(profile: VisualProfile): void {
    this.material.uniforms.uMode.value = profile.backgroundMode;
    this.material.uniforms.uTintA.value.set(profile.tintA);
    this.material.uniforms.uTintB.value.set(profile.tintB);
  }

  update(audio: AudioFeatures, dt: number): void {
    this.material.uniforms.uBass.value = audio.bass;
    this.material.uniforms.uMid.value = audio.mid;
    this.material.uniforms.uHigh.value = audio.high;
    this.material.uniforms.uTime.value += dt;
  }

  resize(width: number, height: number): void {
    this.material.uniforms.uResolution.value.set(width, height);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
