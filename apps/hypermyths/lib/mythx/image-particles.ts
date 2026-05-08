type RasterSource = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

type PixelSample = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  brightness: number;
};

export type ImageParticleBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  pointSize: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPixelBrightness(
  raster: RasterSource,
  x: number,
  y: number,
): number {
  const safeX = clamp(Math.round(x), 0, raster.width - 1);
  const safeY = clamp(Math.round(y), 0, raster.height - 1);
  const index = (safeY * raster.width + safeX) * 4;
  const r = raster.data[index] ?? 0;
  const g = raster.data[index + 1] ?? 0;
  const b = raster.data[index + 2] ?? 0;
  return (r + g + b) / (255 * 3);
}

function getBackgroundReference(raster: RasterSource) {
  const corners = [
    [0, 0],
    [raster.width - 1, 0],
    [0, raster.height - 1],
    [raster.width - 1, raster.height - 1],
  ] as const;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  for (const [x, y] of corners) {
    const index = (y * raster.width + x) * 4;
    totalR += raster.data[index] ?? 0;
    totalG += raster.data[index + 1] ?? 0;
    totalB += raster.data[index + 2] ?? 0;
  }

  return {
    r: totalR / corners.length,
    g: totalG / corners.length,
    b: totalB / corners.length,
  };
}

function collectImageSamples(
  raster: RasterSource,
  targetCount: number,
): PixelSample[] {
  const samples: PixelSample[] = [];
  const fallbackSamples: PixelSample[] = [];
  const background = getBackgroundReference(raster);
  const area = raster.width * raster.height;
  const step = Math.max(
    1,
    Math.floor(Math.sqrt(area / Math.max(targetCount * 1.8, 1))),
  );

  for (let y = 0; y < raster.height; y += step) {
    for (let x = 0; x < raster.width; x += step) {
      const index = (y * raster.width + x) * 4;
      const alpha = raster.data[index + 3] ?? 0;
      if (alpha < 24) {
        continue;
      }

      const r = raster.data[index] ?? 0;
      const g = raster.data[index + 1] ?? 0;
      const b = raster.data[index + 2] ?? 0;
      const brightness = (r + g + b) / (255 * 3);

      const colorDistance =
        Math.abs(r - background.r) +
        Math.abs(g - background.g) +
        Math.abs(b - background.b);

      const edgeStrength =
        Math.abs(brightness - getPixelBrightness(raster, x + step, y)) +
        Math.abs(brightness - getPixelBrightness(raster, x - step, y)) +
        Math.abs(brightness - getPixelBrightness(raster, x, y + step)) +
        Math.abs(brightness - getPixelBrightness(raster, x, y - step));

      const sample = { x, y, r, g, b, brightness };
      fallbackSamples.push(sample);

      if (colorDistance > 52 || edgeStrength > 0.16) {
        samples.push(sample);
      }
    }
  }

  if (samples.length >= Math.max(48, targetCount / 10)) {
    return samples;
  }

  return fallbackSamples;
}

export function buildImageParticleBuffers(
  raster: RasterSource,
  count: number,
): ImageParticleBuffers {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const samples = collectImageSamples(raster, count);

  if (samples.length === 0) {
    return {
      positions,
      colors,
      pointSize: 0.04,
    };
  }

  const maxDimension = Math.max(raster.width, raster.height);
  const scale = 4.4 / Math.max(maxDimension, 1);
  const depthScale = 0.55;

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const sample =
      samples[Math.floor((i / count) * samples.length)] ?? samples[0];
    const jitterX = (Math.random() - 0.5) * scale * 3.5;
    const jitterY = (Math.random() - 0.5) * scale * 3.5;

    positions[i3] = (sample.x - raster.width / 2) * scale + jitterX;
    positions[i3 + 1] = (raster.height / 2 - sample.y) * scale + jitterY;
    positions[i3 + 2] =
      (0.5 - sample.brightness) * depthScale + (Math.random() - 0.5) * 0.06;

    colors[i3] = sample.r / 255;
    colors[i3 + 1] = sample.g / 255;
    colors[i3 + 2] = sample.b / 255;
  }

  return {
    positions,
    colors,
    pointSize: 0.042,
  };
}
