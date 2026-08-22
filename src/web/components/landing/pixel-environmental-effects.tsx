"use client";

import React, { useEffect, useRef } from "react";

interface PixelEffectProps {
  palette?: "sunset" | "midnight" | "crimson" | "vaporwave";
}

export function PixelEnvironmentalEffects({ palette = "sunset" }: PixelEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    interface PixelParticle {
      x: number;
      y: number;
      size: number; // 2, 3, or 4 px
      vx: number;
      vy: number;
      opacity: number;
      baseOpacity: number;
      pulseSpeed: number;
      pulseOffset: number;
      color: string;
      glowColor: string;
    }

    let particles: PixelParticle[] = [];

    const getColors = () => {
      switch (palette) {
        case "midnight":
          return [
            { fill: "#00f5d4", glow: "rgba(0, 245, 212, 0.6)" },
            { fill: "#4cc9f0", glow: "rgba(76, 201, 240, 0.5)" },
            { fill: "#ffffff", glow: "rgba(255, 255, 255, 0.8)" },
            { fill: "#7209b7", glow: "rgba(114, 9, 183, 0.4)" },
          ];
        case "crimson":
          return [
            { fill: "#ff003c", glow: "rgba(255, 0, 60, 0.7)" },
            { fill: "#ffb703", glow: "rgba(255, 183, 3, 0.6)" },
            { fill: "#ff4d4d", glow: "rgba(255, 77, 77, 0.5)" },
            { fill: "#ffffff", glow: "rgba(255, 255, 255, 0.8)" },
          ];
        case "vaporwave":
          return [
            { fill: "#00ffff", glow: "rgba(0, 255, 255, 0.6)" },
            { fill: "#ff69b4", glow: "rgba(255, 105, 180, 0.6)" },
            { fill: "#ffb6c1", glow: "rgba(255, 182, 193, 0.5)" },
            { fill: "#ffffff", glow: "rgba(255, 255, 255, 0.8)" },
          ];
        case "sunset":
        default:
          return [
            { fill: "#ffd166", glow: "rgba(255, 209, 102, 0.7)" }, // Golden pixel
            { fill: "#ff9f1c", glow: "rgba(255, 159, 28, 0.6)" },  // Warm ember
            { fill: "#ffffff", glow: "rgba(255, 255, 255, 0.9)" },  // Star glint
            { fill: "#f72585", glow: "rgba(247, 37, 133, 0.5)" },  // Sunset pink
          ];
      }
    };

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      if (!canvas) return;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 18000), 75);
      const colorSet = getColors();

      particles = Array.from({ length: count }, () => {
        const c = colorSet[Math.floor(Math.random() * colorSet.length)];
        const size = Math.random() < 0.6 ? 2 : Math.random() < 0.9 ? 3 : 4; // Integer pixel sizes
        const baseOpacity = Math.random() * 0.45 + 0.2;

        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -(Math.random() * 0.35 + 0.1), // Float gently upward from water/horizon
          opacity: baseOpacity,
          baseOpacity,
          pulseSpeed: Math.random() * 2.5 + 1.5,
          pulseOffset: Math.random() * Math.PI * 2,
          color: c.fill,
          glowColor: c.glow,
        };
      });
    }

    let time = 0;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      for (const p of particles) {
        p.x += p.vx + Math.sin(time + p.pulseOffset) * 0.15;
        p.y += p.vy;

        // Wrap around smoothly
        if (p.y < -10) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 5;
        if (p.x > canvas.width + 10) p.x = -5;

        // Breathing opacity
        p.opacity =
          p.baseOpacity + Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.25;
        const finalOpacity = Math.max(0.08, Math.min(0.9, p.opacity));

        ctx.save();
        ctx.globalAlpha = finalOpacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = p.size * 3;

        // Draw crisp pixel square (integer aligned for pixel art feel)
        const ix = Math.floor(p.x);
        const iy = Math.floor(p.y);
        ctx.fillRect(ix, iy, p.size, p.size);
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    const onResize = () => {
      resize();
      createParticles();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, [palette]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ mixBlendMode: "screen" }}
      aria-hidden="true"
    />
  );
}
