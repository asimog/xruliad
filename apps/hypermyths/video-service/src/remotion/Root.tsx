import React from "react";
import { Composition } from "remotion";
import {
  ClipStitchComposition,
  defaultClipStitchProps,
  getClipStitchMetadata,
} from "./ClipStitchComposition";

export const REMOTION_STITCH_COMPOSITION_ID = "clip-stitch";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={REMOTION_STITCH_COMPOSITION_ID}
      component={
        ClipStitchComposition as unknown as React.ComponentType<
          Record<string, unknown>
        >
      }
      defaultProps={defaultClipStitchProps}
      durationInFrames={1}
      fps={30}
      width={720}
      height={1280}
      calculateMetadata={({ props }) =>
        getClipStitchMetadata(props as unknown as typeof defaultClipStitchProps)
      }
    />
  );
};
