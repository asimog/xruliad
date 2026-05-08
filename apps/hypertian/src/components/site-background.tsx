'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMusic, type AudioFeatures } from '@/components/music-provider';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  type: number;
  hue: number;
  alpha: number;
};

type OrbRay = {
  angle: number;
  speed: number;
  length: number;
  width: number;
  life: number;
  maxLife: number;
  hue: number;
  jitter: number;
};

const DISABLED_ROUTES = new Set(['/x-overlay', '/pump-overlay']);
const ANIMATION_STORAGE_KEY = 'hypertian-animations-paused';
const ANIMATION_EVENT = 'hypertian-animation-toggle';

const emptyFeatures: AudioFeatures = {
  bass: 0,
  mid: 0,
  high: 0,
  volume: 0,
  beat: false,
  isPlaying: false,
};

class Noise {
  private p: number[];

  constructor() {
    const perm = new Uint8Array(512);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) base[i] = i;
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];
    this.p = Array.from(perm);
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  }

  noise2D(x: number, y: number) {
    const xBase = Math.floor(x);
    const yBase = Math.floor(y);
    const X = xBase & 255;
    const Y = yBase & 255;
    const xf = x - xBase;
    const yf = y - yBase;
    const u = this.fade(xf);
    const v = this.fade(yf);
    const p = this.p;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v,
    );
  }

  fbm(x: number, y: number, octaves = 4) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < octaves; i += 1) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2.1;
    }
    return value;
  }
}

function generatePalette() {
  const palettes = [
    [
      [39, 121, 167],
      [73, 197, 182],
      [100, 180, 220],
      [50, 160, 200],
    ],
    [
      [120, 50, 180],
      [50, 180, 200],
      [180, 80, 200],
      [80, 200, 180],
    ],
    [
      [10, 40, 80],
      [20, 100, 140],
      [40, 160, 180],
      [80, 200, 200],
    ],
    [
      [0, 200, 255],
      [255, 100, 0],
      [100, 0, 255],
      [0, 255, 150],
    ],
  ];

  return palettes[Math.floor(Math.random() * palettes.length)];
}

function lerpColor(a: number[], b: number[], t: number) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function spawnOrbRay(energy: number): OrbRay {
  const life = 260 + Math.random() * 220;
  return {
    angle: Math.random() * Math.PI * 2,
    speed: 1.8 + Math.random() * 2.8 + energy * 2.2,
    length: 120 + Math.random() * 240 + energy * 180,
    width: 0.8 + Math.random() * 2.4 + energy * 1.6,
    life,
    maxLife: life,
    hue: Math.random(),
    jitter: (Math.random() - 0.5) * 0.32,
  };
}

function drawCentralOrb(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  audio: AudioFeatures,
  now: number,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const time = now * 0.001;
  const baseRadius = Math.min(width, height) < 720 ? 54 : 70;
  const subtlePulse = Math.sin(time * 2) * 5;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 1;

  if (!audio.isPlaying) {
    const radius = baseRadius + subtlePulse;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(39, 121, 167, 0.06)');
    gradient.addColorStop(0.5, 'rgba(39, 121, 167, 0.03)');
    gradient.addColorStop(1, 'rgba(39, 121, 167, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const bassPulse = audio.bass * 80;
  const volumePulse = audio.volume * 40;
  const radius = baseRadius + bassPulse + volumePulse + subtlePulse;
  const beatFlash = audio.beat ? 1.2 : 1;
  const finalRadius = radius * beatFlash;

  const glowLayers = [
    { radius: finalRadius * 2.5 + audio.high * 60, alpha: 0.04 + audio.high * 0.08, color: [39, 121, 167] },
    { radius: finalRadius * 1.8 + audio.mid * 40, alpha: 0.08 + audio.mid * 0.1, color: [39, 140, 180] },
    { radius: finalRadius * 1.3, alpha: 0.12 + audio.volume * 0.15, color: [39, 160, 200] },
  ];

  for (const layer of glowLayers) {
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layer.radius);
    gradient.addColorStop(0, `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, ${layer.alpha * beatFlash})`);
    gradient.addColorStop(1, `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, layer.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (audio.beat) {
    const ringRadius = finalRadius + 40 + audio.bass * 70;
    ctx.strokeStyle = `rgba(39, 160, 200, ${0.4 * audio.bass})`;
    ctx.lineWidth = 2 + audio.bass * 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    const secondRingRadius = finalRadius + 70 + audio.mid * 50;
    ctx.strokeStyle = `rgba(39, 121, 167, ${0.25 * audio.mid})`;
    ctx.lineWidth = 1 + audio.mid * 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, secondRingRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOrbLightRays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  dt: number,
  audio: AudioFeatures,
  rays: OrbRay[],
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const beatBoost = audio.beat ? 1.35 : 1;
  const time = now * 0.001;
  const startRadius = 64 + audio.bass * 90;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = rays.length - 1; i >= 0; i -= 1) {
    const ray = rays[i];
    ray.life -= dt * (audio.isPlaying ? 1 : 1.3);

    if (ray.life <= 0) {
      rays.splice(i, 1);
      continue;
    }

    const progress = 1 - ray.life / ray.maxLife;
    const fade = Math.max(0, 1 - progress);
    const angle = ray.angle + ray.jitter * Math.sin(time * ray.speed);
    const distance = ray.length * (0.25 + progress * 0.95) * beatBoost;
    const lineWidth = Math.max(0.4, ray.width * (1 - progress * 0.65));
    const sx = centerX + Math.cos(angle) * startRadius;
    const sy = centerY + Math.sin(angle) * startRadius;
    const ex = centerX + Math.cos(angle) * (startRadius + distance);
    const ey = centerY + Math.sin(angle) * (startRadius + distance);
    const r = Math.round(70 + 120 * ray.hue);
    const g = Math.round(150 + 90 * (1 - ray.hue * 0.4));
    const b = Math.round(180 + 70 * (1 - ray.hue));
    const alpha = (0.1 + audio.volume * 0.26 + audio.high * 0.16) * fade;
    const gradient = ctx.createLinearGradient(sx, sy, ex, ey);

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    const tipGlow = 3 + lineWidth * 2.4;
    const tip = ctx.createRadialGradient(ex, ey, 0, ex, ey, tipGlow);
    tip.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
    tip.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = tip;
    ctx.beginPath();
    ctx.arc(ex, ey, tipGlow, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function SiteBackground() {
  const pathname = usePathname();
  const music = useMusic();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const featuresRef = useRef<AudioFeatures>(music.features);
  const [animationsPaused, setAnimationsPaused] = useState(false);

  useEffect(() => {
    setAnimationsPaused(window.localStorage.getItem(ANIMATION_STORAGE_KEY) === 'true');

    function onAnimationToggle(event: Event) {
      const detail = (event as CustomEvent<{ paused?: boolean }>).detail;
      setAnimationsPaused(Boolean(detail?.paused));
    }

    window.addEventListener(ANIMATION_EVENT, onAnimationToggle);
    return () => window.removeEventListener(ANIMATION_EVENT, onAnimationToggle);
  }, []);

  useEffect(() => {
    featuresRef.current = music.features;
  }, [music.features]);

  useEffect(() => {
    if (animationsPaused || DISABLED_ROUTES.has(pathname) || pathname?.startsWith('/overlay')) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    const canvasEl = canvas;
    const context = ctx;

    const noise = new Noise();
    const noise2 = new Noise();
    const params = {
      flowScale: 0.003,
      flowSpeed: 0.0004,
      flowStrength: 2.5,
      particleCount: window.innerWidth < 768 ? 150 : 300,
      particleSize: 2,
      particleSizeVar: 3,
      noiseMix: 0.5,
      attractionStrength: 0,
      repulsionRadius: 50,
      damping: 0.98,
      blendMode: 'lighter' as GlobalCompositeOperation,
      trailAlpha: 0.03,
      palette: generatePalette(),
      paletteNext: generatePalette(),
      paletteBlend: 0,
      particleMix: [0.4, 0.3, 0.2, 0.1],
    };

    let animationFrame = 0;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastTime = performance.now();
    let lastParamChange = 0;
    let opacity = 0;
    let isScrolling = false;
    let beatActive = false;
    let emissionCarry = 0;
    const particles: Particle[] = [];
    const orbRays: OrbRay[] = [];

    function mutateParams(now: number) {
      if (now - lastParamChange < 45000 + Math.random() * 45000) return;
      lastParamChange = now;
      params.flowScale = 0.001 + Math.random() * 0.006;
      params.flowSpeed = 0.0001 + Math.random() * 0.001;
      params.flowStrength = 0.5 + Math.random() * 4;
      params.noiseMix = Math.random();
      params.attractionStrength = (Math.random() - 0.5) * 0.3;
      params.repulsionRadius = 20 + Math.random() * 80;
      params.damping = 0.95 + Math.random() * 0.04;
      params.trailAlpha = 0.01 + Math.random() * 0.06;
      params.particleSize = 1 + Math.random() * 4;
      params.particleSizeVar = 1 + Math.random() * 5;
      params.paletteNext = generatePalette();
      params.paletteBlend = 0;
      params.blendMode = ['lighter', 'screen', 'source-over', 'overlay'][Math.floor(Math.random() * 4)] as GlobalCompositeOperation;
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvasEl.width = Math.floor(width * ratio);
      canvasEl.height = Math.floor(height * ratio);
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      pointerX = width / 2;
      pointerY = height / 2;
    }

    function spawnParticle(randomPos = true): Particle {
      const typeRoll = Math.random();
      let type = 0;
      if (typeRoll < params.particleMix[0]) type = 0;
      else if (typeRoll < params.particleMix[0] + params.particleMix[1]) type = 1;
      else if (typeRoll < params.particleMix[0] + params.particleMix[1] + params.particleMix[2]) type = 2;
      else type = 3;

      return {
        x: randomPos ? Math.random() * width : pointerX,
        y: randomPos ? Math.random() * height : pointerY,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: params.particleSize + Math.random() * params.particleSizeVar,
        life: 200 + Math.random() * 400,
        maxLife: 600,
        type,
        hue: Math.random(),
        alpha: 0.3 + Math.random() * 0.7,
      };
    }

    function onPointerMove(event: MouseEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;

      for (let i = 0; i < 3; i += 1) {
        particles.push(spawnParticle(false));
      }
    }

    function onClick(event: MouseEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;

      for (let i = 0; i < 24; i += 1) {
        particles.push(spawnParticle(false));
      }
    }

    function onScroll() {
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 200);
    }

    resize();

    for (let i = 0; i < params.particleCount; i += 1) {
      particles.push(spawnParticle(true));
    }

    function animate(now: number) {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;
      const currentAudio = featuresRef.current ?? emptyFeatures;
      const audio50 = {
        bass: currentAudio.bass * 0.5,
        mid: currentAudio.mid * 0.5,
        high: currentAudio.high * 0.5,
        volume: currentAudio.volume * 0.5,
        beat: currentAudio.beat,
        isPlaying: currentAudio.isPlaying,
      };
      const targetOpacity = isScrolling ? 0.02 : 0.25;
      const audioFlowStrength = audio50.isPlaying ? 1 + audio50.bass * 3 : 1;
      const audioParticleSize = audio50.isPlaying ? 1 + audio50.volume * 2 : 1;
      const audioColorShift = audio50.isPlaying ? audio50.mid * 0.05 : 0;

      opacity += (targetOpacity - opacity) * 0.05;
      mutateParams(now);
      params.paletteBlend = Math.min(1, params.paletteBlend + 0.001 + audioColorShift);

      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.fillStyle = `rgba(0, 0, 0, ${params.trailAlpha})`;
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = params.blendMode;
      context.globalAlpha = opacity;

      const time = now * params.flowSpeed;
      const scale = params.flowScale;
      const audioEnergy = Math.min(1, currentAudio.volume * 0.5 + currentAudio.high * 0.35 + currentAudio.bass * 0.15);
      const baseEmission = currentAudio.isPlaying ? 0.4 + currentAudio.high * 1.8 + currentAudio.volume * 0.8 : 0.05;

      emissionCarry += baseEmission * (dt / 16.67);
      const passiveBurst = Math.floor(emissionCarry);
      if (passiveBurst > 0) {
        emissionCarry -= passiveBurst;
        for (let i = 0; i < passiveBurst; i += 1) {
          orbRays.push(spawnOrbRay(audioEnergy));
        }
      }

      if (currentAudio.beat && !beatActive) {
        beatActive = true;
        const beatRays = 18 + Math.floor(currentAudio.bass * 18);
        for (let i = 0; i < beatRays; i += 1) {
          orbRays.push(spawnOrbRay(Math.min(1, audioEnergy + 0.35)));
        }
      } else if (!currentAudio.beat) {
        beatActive = false;
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.life -= dt * 0.3;

        if (particle.life <= 0 || particle.x < -50 || particle.x > width + 50 || particle.y < -50 || particle.y > height + 50) {
          particles[i] = spawnParticle(true);
          continue;
        }

        const nx = particle.x * scale;
        const ny = particle.y * scale;
        const n = params.noiseMix > 0.5
          ? noise.fbm(nx + time, ny + time * 0.7, 4)
          : noise.noise2D(nx + time, ny + time);
        const angle = n * Math.PI * 4;

        if (particle.type === 0) {
          particle.vx += Math.cos(angle) * params.flowStrength * 0.1 * audioFlowStrength;
          particle.vy += Math.sin(angle) * params.flowStrength * 0.1 * audioFlowStrength;
        } else if (particle.type === 1) {
          const attractN = noise2.fbm(nx * 0.5 + time * 0.3, ny * 0.5, 3);
          const targetX = width * 0.5 + attractN * width * 0.4;
          const targetY = height * 0.5 + attractN * height * 0.4;
          const dx = targetX - particle.x;
          const dy = targetY - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const attractMult = currentAudio.isPlaying ? 1 + audio50.mid * 2 : 1;
          particle.vx += (dx / dist) * params.attractionStrength * attractMult;
          particle.vy += (dy / dist) * params.attractionStrength * attractMult;
        } else if (particle.type === 2) {
          const burstN = noise2.noise2D(nx + time * 2, ny);
          const burstMult = currentAudio.isPlaying ? 1 + audio50.high * 2 : 1;
          particle.vx += Math.cos(burstN * Math.PI * 2) * params.flowStrength * 0.15 * burstMult;
          particle.vy += Math.sin(burstN * Math.PI * 2) * params.flowStrength * 0.15 * burstMult;
        } else {
          const dx = pointerX - particle.x;
          const dy = pointerY - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const orbitStrength = Math.min(200, dist) * 0.01;
          particle.vx += (-dy / dist) * orbitStrength;
          particle.vy += (dx / dist) * orbitStrength;
        }

        const mdx = pointerX - particle.x;
        const mdy = pointerY - particle.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy) + 1;

        if (mdist < 200) {
          particle.vx += (mdx / mdist) * 0.15;
          particle.vy += (mdy / mdist) * 0.15;
        }

        if (mdist < params.repulsionRadius && mdist > 1) {
          particle.vx -= (mdx / mdist) * 0.5;
          particle.vy -= (mdy / mdist) * 0.5;
        }

        particle.vx *= params.damping;
        particle.vy *= params.damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const lifeRatio = particle.life / particle.maxLife;
        const currentSize = particle.size * (0.5 + lifeRatio * 0.5) * (currentAudio.isPlaying ? audioParticleSize : 1);
        const alphaFade = Math.min(1, lifeRatio * 2) * particle.alpha * opacity;
        const beatAlpha = audio50.beat ? 1.5 : 1;
        const paletteIndex = Math.floor(particle.hue * 4) % 4;
        const nextIndex = (paletteIndex + 1) % 4;
        const color = lerpColor(params.palette[paletteIndex], params.paletteNext[nextIndex], params.paletteBlend);
        const colorMult = currentAudio.isPlaying ? 1 + audio50.volume * 0.5 : 1;
        const r = Math.round(Math.min(255, color[0] * colorMult));
        const g = Math.round(Math.min(255, color[1] * colorMult));
        const b = Math.round(Math.min(255, color[2] * colorMult));

        context.beginPath();
        context.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alphaFade * 0.6 * beatAlpha})`;
        context.fill();

        const glowThreshold = currentAudio.isPlaying ? 1.5 : 2;
        if (currentSize > glowThreshold) {
          const glowRadius = currentSize * (currentAudio.isPlaying ? 4 + audio50.bass * 2 : 3);
          const glow = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, glowRadius);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaFade * 0.3 * beatAlpha})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          context.fillStyle = glow;
          context.beginPath();
          context.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
          context.fill();
        }

        if (i % 5 === 0) {
          for (let j = i + 1; j < Math.min(i + 10, particles.length); j += 1) {
            const other = particles[j];
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 60 && dist > 1) {
              context.beginPath();
              context.moveTo(particle.x, particle.y);
              context.lineTo(other.x, other.y);
              context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(1 - dist / 60) * 0.1 * alphaFade})`;
              context.lineWidth = 0.5;
              context.stroke();
            }
          }
        }
      }

      while (particles.length > params.particleCount + 50) {
        particles.shift();
      }

      while (orbRays.length > 150) {
        orbRays.shift();
      }

      drawOrbLightRays(context, width, height, now, dt, currentAudio, orbRays);
      drawCentralOrb(context, width, height, currentAudio, now);
      animationFrame = window.requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [animationsPaused, pathname]);

  if (DISABLED_ROUTES.has(pathname) || pathname?.startsWith('/overlay') || animationsPaused) {
    return null;
  }

  return (
    <div aria-hidden="true" className="site-background-shell">
      <canvas className="site-background-canvas" ref={canvasRef} />
    </div>
  );
}
