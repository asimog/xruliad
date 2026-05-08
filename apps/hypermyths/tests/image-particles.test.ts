import { describe, expect, it } from "vitest";
import { buildImageParticleBuffers } from "@/lib/mythx/image-particles";

describe("buildImageParticleBuffers", () => {
  it("prefers non-background pixels over flat corners", () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i += 1) {
      const index = i * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = 255;
    }

    const centerPixel = (1 * width + 1) * 4;
    data[centerPixel] = 255;
    data[centerPixel + 1] = 0;
    data[centerPixel + 2] = 0;

    const buffers = buildImageParticleBuffers({ width, height, data }, 24);

    let redDominantCount = 0;
    for (let i = 0; i < buffers.colors.length; i += 3) {
      const r = buffers.colors[i];
      const g = buffers.colors[i + 1];
      const b = buffers.colors[i + 2];
      if (r > g && r > b) {
        redDominantCount += 1;
      }
    }

    expect(redDominantCount).toBeGreaterThan(0);
  });
});
