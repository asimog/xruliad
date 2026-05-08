export function avg(data: Uint8Array, start: number, end: number): number {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.floor(end));
  if (to <= from) return 0;

  let sum = 0;
  for (let i = from; i < to; i += 1) {
    sum += data[i] / 255;
  }

  return sum / (to - from);
}

export function rms(data: Uint8Array): number {
  if (data.length === 0) return 0;

  let energy = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = (data[i] - 128) / 128;
    energy += v * v;
  }

  return Math.sqrt(energy / data.length);
}
