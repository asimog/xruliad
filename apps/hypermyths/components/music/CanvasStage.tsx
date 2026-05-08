"use client";

import { useEffect, useRef } from "react";
import { createEngine, type EngineController } from "@/lib/music/core/engine";
import type { FrameSnapshot } from "@/lib/music/core/loop";

type CanvasStageProps = {
  onReady: (controller: EngineController) => void;
  onFrame: (frame: FrameSnapshot) => void;
};

export function CanvasStage({ onReady, onFrame }: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = createEngine(canvas, onFrame);
    onReady(controller);

    return () => {
      controller.dispose();
    };
  }, [onFrame, onReady]);

  return <canvas ref={canvasRef} className="music-canvas" />;
}
