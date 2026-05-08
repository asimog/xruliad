"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ProductId } from "@hypermyths/theme";
import { getProduct } from "@hypermyths/theme";

export type BackgroundProps = {
  productId: ProductId;
  children?: ReactNode;
  motion?: "auto" | "reduced" | "off";
  intensity?: "quiet" | "standard" | "high";
  className?: string;
};

export function EcosystemBackground({
  productId,
  children,
  motion = "auto",
  intensity = "standard",
  className = ""
}: BackgroundProps) {
  const product = getProduct(productId);
  const style = {
    "--ecosystem-accent": product.accent,
    "--ecosystem-accent-soft": product.accentSoft
  } as CSSProperties;

  return (
    <div
      className={`ecosystem-background ecosystem-background--${productId} ecosystem-background--${motion} ecosystem-background--${intensity} ${className}`}
      data-product={productId}
      style={style}
    >
      <div className="ecosystem-background__orbital" aria-hidden="true" />
      <div className="ecosystem-background__grid" aria-hidden="true" />
      <div className="ecosystem-background__particles" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="ecosystem-background__noise" aria-hidden="true" />
      {children}
    </div>
  );
}

export const BackgroundShell = EcosystemBackground;
export const MythicGridBackground = EcosystemBackground;

export function ParticleField({ productId }: { productId: ProductId }) {
  return <EcosystemBackground productId={productId} motion="auto" intensity="quiet" />;
}

export function OrbitalGradient({ productId }: { productId: ProductId }) {
  return <div className={`orbital-gradient orbital-gradient--${productId}`} aria-hidden="true" />;
}

export function NoiseOverlay() {
  return <div className="noise-overlay" aria-hidden="true" />;
}

export function MythicGrid() {
  return <div className="mythic-grid" aria-hidden="true" />;
}

export function AnimatedRings() {
  return <div className="animated-rings" aria-hidden="true" />;
}

export function DataConstellation() {
  return <div className="data-constellation" aria-hidden="true" />;
}

export function SimulationField() {
  return <div className="simulation-field" aria-hidden="true" />;
}

export function ResearchGrid() {
  return <div className="research-grid" aria-hidden="true" />;
}

export function AttentionStreams() {
  return <div className="attention-streams" aria-hidden="true" />;
}
