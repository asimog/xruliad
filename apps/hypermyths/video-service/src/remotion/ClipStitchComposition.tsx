import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from "remotion";

export interface ClipStitchItem {
  src: string;
  durationInFrames: number;
}

export interface ClipStitchProps {
  clips: ClipStitchItem[];
  fps: number;
  width: number;
  height: number;
  transitionFrames?: number;
}

export const defaultClipStitchProps: ClipStitchProps = {
  clips: [],
  fps: 30,
  width: 720,
  height: 1280,
  transitionFrames: 12,
};

export function getClipStitchMetadata(props: ClipStitchProps) {
  const transitionFrames = Math.max(0, Math.floor(props.transitionFrames ?? 0));
  const overlapTotal = Math.max(0, props.clips.length - 1) * transitionFrames;
  const durationInFrames = Math.max(
    1,
    props.clips.reduce((sum, clip) => sum + clip.durationInFrames, 0) - overlapTotal,
  );

  return {
    durationInFrames,
    fps: props.fps,
    width: props.width,
    height: props.height,
  };
}

const ClipLayer: React.FC<{
  src: string;
  durationInFrames: number;
  transitionFrames: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ src, durationInFrames, transitionFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();

  const fadeInOpacity = isFirst
    ? 1
    : interpolate(frame, [0, transitionFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const fadeOutOpacity = isLast
    ? 1
    : interpolate(
        frame,
        [Math.max(0, durationInFrames - transitionFrames), durationInFrames],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );

  const opacity = Math.max(0, Math.min(1, fadeInOpacity * fadeOutOpacity));

  return (
    <AbsoluteFill style={{ backgroundColor: "black", opacity }}>
      <OffthreadVideo
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
};

export const ClipStitchComposition: React.FC<ClipStitchProps> = (props) => {
  const transitionFrames = Math.max(0, Math.floor(props.transitionFrames ?? 0));
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {props.clips.map((clip, index) => {
        const sequenceFrom = index === 0 ? 0 : Math.max(0, from - transitionFrames);
        const sequence = (
          <Sequence
            key={`${clip.src}-${index}`}
            from={sequenceFrom}
            durationInFrames={clip.durationInFrames}
          >
            <ClipLayer
              src={clip.src}
              durationInFrames={clip.durationInFrames}
              transitionFrames={transitionFrames}
              isFirst={index === 0}
              isLast={index === props.clips.length - 1}
            />
          </Sequence>
        );

        from = sequenceFrom + clip.durationInFrames;
        return sequence;
      })}
    </AbsoluteFill>
  );
};
