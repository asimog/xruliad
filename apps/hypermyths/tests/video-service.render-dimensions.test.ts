import { describe, expect, it } from "vitest";
import { resolveRenderDimensions } from "../video-service/src/pipeline/render-dimensions";

describe("xAI render dimensions", () => {
  it("uses the lowest 16:9 raster as 848x480", () => {
    expect(
      resolveRenderDimensions({
        resolution: "480p",
        aspectRatio: "16:9",
      }),
    ).toEqual({ width: 848, height: 480 });
  });

  it("keeps equivalent 480p rasters for vertical and square outputs", () => {
    expect(
      resolveRenderDimensions({
        resolution: "480p",
        aspectRatio: "9:16",
      }),
    ).toEqual({ width: 480, height: 848 });

    expect(
      resolveRenderDimensions({
        resolution: "480p",
        aspectRatio: "1:1",
      }),
    ).toEqual({ width: 480, height: 480 });
  });
});
