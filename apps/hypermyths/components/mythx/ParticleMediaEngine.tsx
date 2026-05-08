"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildImageParticleBuffers } from "@/lib/mythx/image-particles";
import { useAudioFeatures } from "@/lib/music/audio/music-engine-provider";

type FormationType = "sphere" | "cube" | "helix" | "donut" | "galaxy";

interface ParticleMediaEngineProps {
  onReady?: (engine: ParticleEngineAPI) => void;
  formation?: FormationType;
  particleCount?: number;
  glowIntensity?: number;
  interactive?: boolean;
}

export interface ParticleEngineAPI {
  setFormation: (formation: FormationType) => void;
  setParticleCount: (count: number) => void;
  setGlowIntensity: (intensity: number) => void;
  loadImage: (file: File) => void;
  loadVideo: (file: File) => void;
  load3DModel: (file: File) => void;
  dispose: () => void;
}

type ActiveVideoState = {
  element: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  objectUrl: string;
  lastSampleAt: number;
};

type EngineState = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  particles: THREE.Points | null;
  time: number;
  animationId: number;
  formation: FormationType;
  particleCount: number;
  glowIntensity: number;
  objectUrls: string[];
  activeVideo: ActiveVideoState | null;
};

type LayoutMode = FormationType | "image" | "video";

function createParticleCloud(
  positions: Float32Array,
  colors: Float32Array,
  options: {
    layoutMode: LayoutMode;
    pointSize: number;
  },
): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.userData.basePositions = positions.slice();
  geometry.userData.baseColors = colors.slice();
  geometry.userData.layoutMode = options.layoutMode;
  geometry.userData.pointSize = options.pointSize;

  const material = new THREE.PointsMaterial({
    size: options.pointSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createParticles(
  count: number,
  formation: FormationType,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;

    switch (formation) {
      case "sphere": {
        const radius = 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        break;
      }

      case "cube": {
        const size = 2.5;
        positions[i3] = (Math.random() - 0.5) * size;
        positions[i3 + 1] = (Math.random() - 0.5) * size;
        positions[i3 + 2] = (Math.random() - 0.5) * size;
        break;
      }

      case "helix": {
        const t = (i / count) * Math.PI * 12;
        const helixRadius = 1.5;
        positions[i3] = Math.cos(t) * helixRadius;
        positions[i3 + 1] = (i / count - 0.5) * 5;
        positions[i3 + 2] = Math.sin(t) * helixRadius;
        break;
      }

      case "donut": {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const majorRadius = 1.8;
        const minorRadius = 0.6;
        positions[i3] =
          (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
        positions[i3 + 1] =
          (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
        positions[i3 + 2] = minorRadius * Math.sin(v);
        break;
      }

      case "galaxy": {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 3;
        const spiral = angle + dist * 2;
        positions[i3] = Math.cos(spiral) * dist;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.3;
        positions[i3 + 2] = Math.sin(spiral) * dist;
        break;
      }
    }

    color.setHSL(
      0.55 + Math.random() * 0.1,
      0.6 + Math.random() * 0.3,
      0.4 + Math.random() * 0.3,
    );
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  return createParticleCloud(positions, colors, {
    layoutMode: formation,
    pointSize: 0.03,
  });
}

function replaceParticles(
  engine: EngineState,
  nextParticles: THREE.Points,
) {
  if (engine.particles) {
    engine.scene.remove(engine.particles);
    engine.particles.geometry.dispose();
    (engine.particles.material as THREE.Material).dispose();
  }

  engine.scene.add(nextParticles);
  engine.particles = nextParticles;
}

function applyParticleBuffers(
  particles: THREE.Points,
  buffers: {
    positions: Float32Array;
    colors: Float32Array;
    pointSize: number;
  },
  layoutMode: LayoutMode,
) {
  const geometry = particles.geometry;
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(buffers.positions, 3),
  );
  geometry.setAttribute("color", new THREE.BufferAttribute(buffers.colors, 3));
  geometry.userData.basePositions = buffers.positions.slice();
  geometry.userData.baseColors = buffers.colors.slice();
  geometry.userData.layoutMode = layoutMode;
  geometry.userData.pointSize = buffers.pointSize;
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function clearActiveVideo(engine: EngineState | null) {
  if (!engine?.activeVideo) return;
  URL.revokeObjectURL(engine.activeVideo.objectUrl);
  engine.objectUrls = engine.objectUrls.filter(
    (value) => value !== engine.activeVideo?.objectUrl,
  );
  engine.activeVideo.element.pause();
  engine.activeVideo.element.removeAttribute("src");
  engine.activeVideo.element.load();
  engine.activeVideo = null;
}

function sampleActiveVideo(engine: EngineState) {
  const activeVideo = engine.activeVideo;
  if (!activeVideo) return;

  const video = activeVideo.element;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const now = performance.now();
  if (now - activeVideo.lastSampleAt < 120) {
    return;
  }
  activeVideo.lastSampleAt = now;

  const intrinsicWidth = video.videoWidth || 1;
  const intrinsicHeight = video.videoHeight || 1;
  const maxSize = 220;
  const scale = Math.min(1, maxSize / Math.max(intrinsicWidth, intrinsicHeight));
  activeVideo.canvas.width = Math.max(1, Math.round(intrinsicWidth * scale));
  activeVideo.canvas.height = Math.max(1, Math.round(intrinsicHeight * scale));
  activeVideo.context.drawImage(
    video,
    0,
    0,
    activeVideo.canvas.width,
    activeVideo.canvas.height,
  );

  const imageData = activeVideo.context.getImageData(
    0,
    0,
    activeVideo.canvas.width,
    activeVideo.canvas.height,
  );
  const buffers = buildImageParticleBuffers(
    {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
    },
    engine.particleCount,
  );

  if (engine.particles) {
    applyParticleBuffers(engine.particles, buffers, "video");
  } else {
    const cloud = createParticleCloud(buffers.positions, buffers.colors, {
      layoutMode: "video",
      pointSize: buffers.pointSize,
    });
    engine.scene.add(cloud);
    engine.particles = cloud;
  }
}

function updateParticles(
  particles: THREE.Points,
  audio: {
    bass: number;
    mid: number;
    high: number;
    volume: number;
    isPlaying: boolean;
  },
  formation: FormationType,
  glowIntensity: number,
  time: number,
) {
  const geometry = particles.geometry;
  const positions = geometry.attributes.position.array as Float32Array;
  const colors = geometry.attributes.color.array as Float32Array;
  const basePositions = geometry.userData.basePositions as
    | Float32Array
    | undefined;
  const baseColors = geometry.userData.baseColors as Float32Array | undefined;
  const layoutMode =
    (geometry.userData.layoutMode as LayoutMode | undefined) ?? formation;
  const count = positions.length / 3;

  // Strong audio multipliers — visible even at moderate volume
  const bassBoost = audio.isPlaying ? audio.bass * 2.8 : 0;
  const volumeBoost = audio.isPlaying ? audio.volume * 2.0 : 0;
  const highBoost = audio.isPlaying ? audio.high * 1.6 : 0;
  const midBoost = audio.isPlaying ? audio.mid * 2.2 : 0;

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const baseX = basePositions?.[i3] ?? positions[i3];
    const baseY = basePositions?.[i3 + 1] ?? positions[i3 + 1];
    const baseZ = basePositions?.[i3 + 2] ?? positions[i3 + 2];

    switch (layoutMode) {
      case "image":
      case "video": {
        const pulse = 1 + bassBoost * 0.18;
        positions[i3] =
          baseX * pulse +
          Math.sin(time * 1.4 + i * 0.17) * 0.05 * (0.5 + highBoost);
        positions[i3 + 1] =
          baseY * pulse +
          Math.cos(time * 1.2 + i * 0.11) * 0.05 * (0.5 + volumeBoost);
        positions[i3 + 2] =
          baseZ + Math.sin(time * 2 + i * 0.07) * 0.22 * (0.3 + bassBoost);
        break;
      }

      case "sphere": {
        const pulse = 1 + bassBoost * 0.35;
        positions[i3] =
          baseX * pulse + Math.sin(time * 2.1 + i * 0.011) * 0.14 * (1 + bassBoost);
        positions[i3 + 1] =
          baseY * pulse + Math.cos(time * 1.8 + i * 0.011) * 0.14 * (1 + volumeBoost);
        positions[i3 + 2] =
          baseZ * pulse + Math.sin(time * 1.5 + i * 0.013) * 0.11 * (1 + midBoost);
        break;
      }

      case "cube": {
        const inflate = 1 + bassBoost * 0.45;
        positions[i3] =
          baseX * inflate + Math.sin(time * 1.6 + i * 0.019) * 0.1 * (1 + highBoost);
        positions[i3 + 1] =
          baseY * inflate + Math.cos(time * 1.3 + i * 0.021) * 0.1 * (1 + volumeBoost);
        positions[i3 + 2] =
          baseZ * inflate + Math.sin(time * 1.9 + i * 0.015) * 0.09 * (1 + midBoost);
        break;
      }

      case "helix": {
        const helixPulse = 1 + midBoost * 0.3;
        positions[i3] = baseX * helixPulse;
        positions[i3 + 1] =
          baseY + Math.sin(time * 1.4 + i * 0.005) * 0.18 * (1 + bassBoost);
        positions[i3 + 2] = baseZ * helixPulse;
        break;
      }

      case "galaxy": {
        const spiralSpeed = 0.0015 * (1 + bassBoost * 3);
        const dist = Math.sqrt(baseX * baseX + baseZ * baseZ) || 1;
        const angle = Math.atan2(baseZ, baseX) + spiralSpeed;
        const distPulse = dist * (1 + midBoost * 0.25);
        positions[i3] = Math.cos(angle) * distPulse;
        positions[i3 + 1] = baseY + Math.sin(time * 2 + i * 0.008) * 0.08 * (1 + highBoost);
        positions[i3 + 2] = Math.sin(angle) * distPulse;
        break;
      }

      default:
        positions[i3] = baseX;
        positions[i3 + 1] = baseY;
        positions[i3 + 2] = baseZ;
        break;
    }

    if (baseColors) {
      // Colors shift with frequency bands: bass → warm, mid → teal, high → cool
      const intensity = 0.75 + glowIntensity * 0.5 + volumeBoost * 0.9;
      const r = Math.min(1, baseColors[i3] * intensity + bassBoost * 0.35);
      const g = Math.min(1, baseColors[i3 + 1] * intensity + midBoost * 0.2);
      const b = Math.min(1, baseColors[i3 + 2] * intensity + highBoost * 0.3);
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;
    }
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;

  const material = particles.material as THREE.PointsMaterial;
  const basePointSize =
    (geometry.userData.pointSize as number | undefined) ?? 0.03;
  // Point size pulses hard on bass beats
  material.size = basePointSize * (1 + glowIntensity * 0.8 + bassBoost * 2.5);
}

export function ParticleMediaEngine({
  onReady,
  formation = "galaxy",
  particleCount = 100,
  glowIntensity = 0.5,
  interactive = false,
}: ParticleMediaEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineState | null>(null);
  const audio = useAudioFeatures();
  const audioRef = useRef(audio);

  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));

    const particles = createParticles(particleCount, formation);
    scene.add(particles);

    engineRef.current = {
      scene,
      camera,
      renderer,
      particles,
      time: 0,
      animationId: 0,
      formation,
      particleCount,
      glowIntensity,
      objectUrls: [],
      activeVideo: null,
    };

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotX = 0;
    let rotY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      rotY += deltaX * 0.01;
      rotX += deltaY * 0.01;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    if (interactive) {
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
    }

    const animate = () => {
      if (!engineRef.current) return;

      engineRef.current.animationId = requestAnimationFrame(animate);
      engineRef.current.time += 0.016;

      const engine = engineRef.current;

      if (!isDragging) {
        rotY += 0.002;
      }

      if (engine.particles) {
        engine.particles.rotation.y = rotY;
        engine.particles.rotation.x = rotX;
        sampleActiveVideo(engine);

        updateParticles(
          engine.particles,
          audioRef.current,
          engine.formation,
          engine.glowIntensity,
          engine.time,
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (nextWidth === 0 || nextHeight === 0) return;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener("resize", handleResize);

    const api: ParticleEngineAPI = {
      setFormation: (newFormation) => {
        if (!engineRef.current) return;
        clearActiveVideo(engineRef.current);
        engineRef.current.formation = newFormation;
        replaceParticles(
          engineRef.current,
          createParticles(engineRef.current.particleCount, newFormation),
        );
      },
      setParticleCount: (count) => {
        if (!engineRef.current) return;
        engineRef.current.particleCount = count;
        if (engineRef.current.activeVideo) {
          sampleActiveVideo(engineRef.current);
          return;
        }
        replaceParticles(
          engineRef.current,
          createParticles(count, engineRef.current.formation),
        );
      },
      setGlowIntensity: (intensity) => {
        if (!engineRef.current) return;
        engineRef.current.glowIntensity = intensity;
      },
      loadImage: (file) => {
        if (!engineRef.current) return;
        clearActiveVideo(engineRef.current);

        const objectUrl = URL.createObjectURL(file);
        engineRef.current.objectUrls.push(objectUrl);

        const image = new Image();
        image.onload = () => {
          if (!engineRef.current) return;

          const offscreen = document.createElement("canvas");
          const context = offscreen.getContext("2d", {
            willReadFrequently: true,
          });
          if (!context) return;

          const intrinsicWidth = image.naturalWidth || image.width;
          const intrinsicHeight = image.naturalHeight || image.height;
          const maxSize = 220;
          const scale = Math.min(
            1,
            maxSize / Math.max(intrinsicWidth, intrinsicHeight, 1),
          );

          offscreen.width = Math.max(1, Math.round(intrinsicWidth * scale));
          offscreen.height = Math.max(1, Math.round(intrinsicHeight * scale));
          context.drawImage(image, 0, 0, offscreen.width, offscreen.height);

          const imageData = context.getImageData(
            0,
            0,
            offscreen.width,
            offscreen.height,
          );

          const { positions, colors, pointSize } = buildImageParticleBuffers(
            {
              width: imageData.width,
              height: imageData.height,
              data: imageData.data,
            },
            engineRef.current.particleCount,
          );

          replaceParticles(
            engineRef.current,
            createParticleCloud(positions, colors, {
              layoutMode: "image",
              pointSize,
            }),
          );

          URL.revokeObjectURL(objectUrl);
          engineRef.current.objectUrls = engineRef.current.objectUrls.filter(
            (value) => value !== objectUrl,
          );
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (!engineRef.current) return;
          engineRef.current.objectUrls = engineRef.current.objectUrls.filter(
            (value) => value !== objectUrl,
          );
        };

        image.src = objectUrl;
      },
      loadVideo: (file) => {
        if (!engineRef.current) return;
        clearActiveVideo(engineRef.current);

        const objectUrl = URL.createObjectURL(file);
        engineRef.current.objectUrls.push(objectUrl);

        const video = document.createElement("video");
        video.src = objectUrl;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = "auto";

        const canvasForFrames = document.createElement("canvas");
        const context = canvasForFrames.getContext("2d", {
          willReadFrequently: true,
        });

        if (!context) {
          URL.revokeObjectURL(objectUrl);
          engineRef.current.objectUrls = engineRef.current.objectUrls.filter(
            (value) => value !== objectUrl,
          );
          return;
        }

        video.onloadeddata = () => {
          if (!engineRef.current) return;
          engineRef.current.activeVideo = {
            element: video,
            canvas: canvasForFrames,
            context,
            objectUrl,
            lastSampleAt: 0,
          };
          void video.play().catch(() => {
            // Browsers may still gate playback; frame sampling resumes once data advances.
          });
          sampleActiveVideo(engineRef.current);
        };

        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (!engineRef.current) return;
          engineRef.current.objectUrls = engineRef.current.objectUrls.filter(
            (value) => value !== objectUrl,
          );
        };
      },
      load3DModel: (file) => {
        console.log("3D model uploaded:", file.name);
      },
      dispose: () => {
        cancelAnimationFrame(engineRef.current?.animationId || 0);
        window.removeEventListener("resize", handleResize);
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        clearActiveVideo(engineRef.current);
        for (const objectUrl of engineRef.current?.objectUrls ?? []) {
          URL.revokeObjectURL(objectUrl);
        }
        renderer.dispose();
      },
    };

    onReady?.(api);

    return () => {
      cancelAnimationFrame(engineRef.current?.animationId || 0);
      window.removeEventListener("resize", handleResize);
      if (interactive) {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
      }
      clearActiveVideo(engineRef.current);
      for (const objectUrl of engineRef.current?.objectUrls ?? []) {
        URL.revokeObjectURL(objectUrl);
      }
      renderer.dispose();
      engineRef.current = null;
    };
  // Renderer boot should only depend on mount-time wiring; prop updates are handled below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, onReady]);

  useEffect(() => {
    if (!engineRef.current || engineRef.current.formation === formation) return;
    clearActiveVideo(engineRef.current);
    engineRef.current.formation = formation;
    replaceParticles(
      engineRef.current,
      createParticles(engineRef.current.particleCount, formation),
    );
  }, [formation]);

  useEffect(() => {
    if (!engineRef.current || engineRef.current.particleCount === particleCount) {
      return;
    }
    engineRef.current.particleCount = particleCount;
    if (engineRef.current.activeVideo) {
      sampleActiveVideo(engineRef.current);
      return;
    }
    replaceParticles(
      engineRef.current,
      createParticles(particleCount, engineRef.current.formation),
    );
  }, [particleCount]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.glowIntensity = glowIntensity;
  }, [glowIntensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: interactive ? "auto" : "none",
      }}
    />
  );
}
