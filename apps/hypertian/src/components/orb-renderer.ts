import { type AudioFeatures } from '@/components/music-provider';

export type OrbRay = {
  angle: number;
  speed: number;
  length: number;
  width: number;
  life: number;
  maxLife: number;
  hue: number;
  jitter: number;
};

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

export function drawCentralOrb(
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
    { radius: finalRadius * 2.5 + audio.high * 60, alpha: 0.04 + audio.high * 0.08, color: [39, 121, 167] as const },
    { radius: finalRadius * 1.8 + audio.mid * 40, alpha: 0.08 + audio.mid * 0.1, color: [39, 140, 180] as const },
    { radius: finalRadius * 1.3, alpha: 0.12 + audio.volume * 0.15, color: [39, 160, 200] as const },
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

export function drawOrbLightRays(
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
