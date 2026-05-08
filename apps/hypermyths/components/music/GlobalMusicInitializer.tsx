"use client";

import { useEffect, useRef } from "react";
import { useMusicEngine } from "@/lib/music/audio/music-engine-provider";

export function GlobalMusicInitializer() {
  const { isInitialized, initializeEngine } = useMusicEngine() ?? {};
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;
    initializeEngine?.(canvasRef.current);
  }, [isInitialized, initializeEngine]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
