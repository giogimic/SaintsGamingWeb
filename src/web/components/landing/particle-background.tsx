"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Floating particle background — pure Canvas, no images.
 * Creates subtle floating dots that drift upward with gentle motion.
 */
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);

  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      fadeDirection: number;
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      if (!canvas) return;
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      particles = Array.from({ length: Math.min(count, 80) }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -(Math.random() * 0.3 + 0.1),
        opacity: Math.random() * 0.4 + 0.1,
        fadeDirection: Math.random() > 0.5 ? 1 : -1,
      }));
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Move
        p.x += p.speedX;
        p.y += p.speedY;

        // Gentle opacity pulsing
        p.opacity += p.fadeDirection * 0.002;
        if (p.opacity > 0.5) p.fadeDirection = -1;
        if (p.opacity < 0.05) p.fadeDirection = 1;

        // Wrap around edges
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        let colorStr = "oklch(0.82 0.12 85"; // default dark/light gold
        if (themeRef.current === "hacker") {
          colorStr = "oklch(0.8 0.2 150"; // hacker green
        } else if (themeRef.current === "light") {
          colorStr = "oklch(0.5 0.15 85"; // light mode deep gold
        } else if (themeRef.current === "dark") {
          colorStr = "oklch(0.82 0.12 85"; // dark mode bright gold
        }
        
        ctx.fillStyle = `${colorStr} / ${p.opacity})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
