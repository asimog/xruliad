import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const GLYPHS = ["天", "·", "哪", "吒"];
const COUNT = 18000;

type MatrixClose = () => void;
type MatrixOptions = {
  onClose?: () => void;
};

function createGlyphAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context unavailable for glyph atlas.");
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ffaa";
  ctx.textAlign = "center";
  ctx.font = "bold 84px serif";

  GLYPHS.forEach((glyph, i) => {
    ctx.fillText(glyph, canvas.width * 0.5, 92 + i * 108);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createSkullMaskTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context unavailable for skull mask.");
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";

  // Skull cap
  ctx.beginPath();
  ctx.ellipse(512, 430, 285, 310, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw
  ctx.fillRect(338, 580, 348, 220);

  // Eye sockets
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(412, 430, 74, 58, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(612, 430, 74, 58, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nasal cavity
  ctx.beginPath();
  ctx.moveTo(510, 470);
  ctx.lineTo(470, 560);
  ctx.lineTo(550, 560);
  ctx.closePath();
  ctx.fill();

  // Teeth separators
  for (let i = 1; i < 7; i += 1) {
    const x = 338 + (348 / 7) * i;
    ctx.fillRect(x - 3, 620, 6, 170);
  }

  // Jaw round corners carve-out
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(338, 790, 45, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(686, 790, 45, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function openMatrixModal(analyser: AnalyserNode, options?: MatrixOptions): MatrixClose {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;inset:0;background:black;z-index:9999;cursor:pointer;`;
  document.body.appendChild(container);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 120;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.6),
  );

  const data = new Uint8Array(analyser.frequencyBinCount);

  const getBass = (): number => {
    analyser.getByteFrequencyData(data);
    const bins = Math.min(20, data.length);
    if (bins === 0) return 0;

    let sum = 0;
    for (let i = 0; i < bins; i += 1) sum += data[i];
    return sum / bins / 255;
  };

  const atlas = createGlyphAtlas();
  const skull = createSkullMaskTexture();

  const basePlane = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = basePlane.index;
  geo.attributes = basePlane.attributes;

  const offsets = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const glyphIndex = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i += 1) {
    offsets[i * 3] = (Math.random() - 0.5) * 200;
    offsets[i * 3 + 1] = Math.random() * 200;
    offsets[i * 3 + 2] = (Math.random() - 0.5) * 50;

    seeds[i] = Math.random();
    glyphIndex[i] = Math.floor(Math.random() * GLYPHS.length);
  }

  geo.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute("glyphIndex", new THREE.InstancedBufferAttribute(glyphIndex, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      bass: { value: 0 },
      atlas: { value: atlas },
      skull: { value: skull },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: `
      attribute vec3 offset;
      attribute float seed;
      attribute float glyphIndex;

      uniform float time;

      varying vec2 vUv;
      varying float vGlyph;
      varying float vSeed;

      void main() {
        vUv = uv;
        vGlyph = glyphIndex;
        vSeed = seed;

        vec3 pos = offset;

        float speed = 20.0 + seed * 30.0;
        pos.y -= mod(time * speed + seed * 100.0, 200.0);
        pos.x += sin(time + seed * 10.0) * 2.0;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D atlas;
      uniform sampler2D skull;
      uniform float time;
      uniform float bass;
      uniform vec2 uResolution;

      varying vec2 vUv;
      varying float vGlyph;
      varying float vSeed;

      void main() {
        vec2 uv = vUv;
        uv.y = (uv.y + vGlyph) / 4.0;

        vec4 tex = texture2D(atlas, uv);

        vec2 screenUV = gl_FragCoord.xy / uResolution;
        float mask = texture2D(skull, screenUV).r;

        if (mask < 0.2 || tex.r < 0.1) discard;

        float flicker = sin(time * 8.0 + vSeed * 50.0) * 0.5 + 0.5;
        float glow = tex.r * (1.0 + bass * 2.0);
        float trail = smoothstep(0.0, 0.6, vUv.y);

        gl_FragColor = vec4(0.0, 1.0, 0.6, glow * flicker * trail);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  let rafId = 0;
  let running = true;

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    mat.uniforms.uResolution.value.set(w, h);
  };

  const loop = (t: number) => {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    const time = t * 0.001;

    mat.uniforms.time.value = time;
    mat.uniforms.bass.value = getBass();

    camera.position.x = Math.sin(time * 0.2) * 20;
    camera.lookAt(0, 0, 0);

    composer.render();
  };

  const close = () => {
    if (!running) return;
    running = false;

    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    container.removeEventListener("click", close);
    window.removeEventListener("keydown", onEscape);

    composer.dispose();
    renderer.dispose();
    geo.dispose();
    basePlane.dispose();
    mat.dispose();
    atlas.dispose();
    skull.dispose();

    container.remove();
    options?.onClose?.();
  };

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    }
  };

  container.addEventListener("click", close);
  window.addEventListener("keydown", onEscape);
  window.addEventListener("resize", onResize);

  loop(0);

  return close;
}
