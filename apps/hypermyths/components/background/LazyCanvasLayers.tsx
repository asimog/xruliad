"use client";

import dynamic from "next/dynamic";

const DynamicParticleBackground = dynamic(
  () => import("@/components/background/DynamicParticleBackground").then((m) => ({
    default: m.DynamicParticleBackground,
  })),
  { ssr: false }
);

export function LazyCanvasLayers() {
  return (
    <>
      <DynamicParticleBackground />
    </>
  );
}
