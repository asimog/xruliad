import * as THREE from "three";

export function createCamera(width: number, height: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(75, width / Math.max(1, height), 0.1, 100);
  camera.position.z = 2.5;
  return camera;
}

export function resizeCamera(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}
