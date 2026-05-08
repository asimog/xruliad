"use client";

import { useEffect, useRef } from "react";
import { useAudioFeatures } from "@/lib/music/audio/music-engine-provider";

/**
 * Central Audio Orb — ALWAYS visible on ALL pages.
 *
 * When music is not playing: Subtle large glow in center
 * When music plays: Large reactive shadow/glow that responds to audio
 * No small orb - only the large circle/shadow
 */

export function CentralAudioOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const audio = useAudioFeatures();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let time = 0;

    const animate = () => {
      time += 0.016; // ~60fps
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Clear ENTIRE canvas to prevent square artifacts
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base radius for glow
      const baseRadius = 70;
      const subtlePulse = Math.sin(time * 2) * 5; // Gentle breathing effect

      if (!audio.isPlaying) {
        // Subtle large glow when no music
        const radius = baseRadius + subtlePulse;

        // Large subtle glow only
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          radius,
        );
        gradient.addColorStop(0, "rgba(39, 121, 167, 0.06)");
        gradient.addColorStop(0.5, "rgba(39, 121, 167, 0.03)");
        gradient.addColorStop(1, "rgba(39, 121, 167, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        animRef.current = requestAnimationFrame(animate);
        return;
      }

      // MUSIC IS PLAYING - Full audio reactivity at 100%
      // Only large reactive glow/shadow - no small orb

      // Glow radius reacts to audio
      const bassPulse = audio.bass * 80; // 0-80px expansion
      const volumePulse = audio.volume * 40; // 0-40px expansion
      const radius = baseRadius + bassPulse + volumePulse + subtlePulse;

      // Beat flash
      const beatFlash = audio.beat ? 1.2 : 1;
      const finalRadius = radius * beatFlash;

      // Large glow layers (react to different frequencies)
      const glowLayers = [
        {
          radius: finalRadius * 2.5 + audio.high * 60,
          alpha: 0.04 + audio.high * 0.08,
          color: [39, 121, 167],
        },
        {
          radius: finalRadius * 1.8 + audio.mid * 40,
          alpha: 0.08 + audio.mid * 0.1,
          color: [39, 140, 180],
        },
        {
          radius: finalRadius * 1.3,
          alpha: 0.12 + audio.volume * 0.15,
          color: [39, 160, 200],
        },
      ];

      // Draw glow layers
      for (const layer of glowLayers) {
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          layer.radius,
        );
        gradient.addColorStop(
          0,
          `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, ${layer.alpha * beatFlash})`,
        );
        gradient.addColorStop(
          1,
          `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, 0)`,
        );

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, layer.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ring pulse on beats
      if (audio.beat) {
        const ringRadius = finalRadius + 40 + audio.bass * 70;
        ctx.strokeStyle = `rgba(39, 160, 200, ${0.4 * audio.bass})`;
        ctx.lineWidth = 2 + audio.bass * 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Second ring
        const ring2Radius = finalRadius + 70 + audio.mid * 50;
        ctx.strokeStyle = `rgba(39, 121, 167, ${0.25 * audio.mid})`;
        ctx.lineWidth = 1 + audio.mid * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ring2Radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [audio]);

  return (
    <canvas
      ref={canvasRef}
      className="central-audio-orb"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    />
  );
}
