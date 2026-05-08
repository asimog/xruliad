export type XAiAspectRatio = "1:1" | "16:9" | "9:16";
export type XAiResolution = "480p" | "720p";

export function resolveRenderDimensions(input: {
  resolution: XAiResolution;
  aspectRatio: XAiAspectRatio;
}): { width: number; height: number } {
  if (input.resolution === "480p") {
    switch (input.aspectRatio) {
      case "1:1":
        return { width: 480, height: 480 };
      case "9:16":
        return { width: 480, height: 848 };
      case "16:9":
      default:
        return { width: 848, height: 480 };
    }
  }

  switch (input.aspectRatio) {
    case "1:1":
      return { width: 720, height: 720 };
    case "9:16":
      return { width: 720, height: 1280 };
    case "16:9":
    default:
      return { width: 1280, height: 720 };
  }
}
