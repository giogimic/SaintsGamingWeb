"use client";

import { useEffect, useRef } from "react";

// Atmospheric digital snow / slow embers drifting inward from the dark edges
// Small, sharp, semi-translucent — NOT leaves, NOT cartoonish

export function DigitalSnowV5() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    
    interface Particle {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      opacity: number;
      baseOpacity: number;
      flickerOffset: number;
    }
    
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      if (!canvas) return;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 6000), 250);
      particles = Array.from({ length: count }, () => {
        const baseOpacity = Math.random() * 0.5 + 0.1;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.8 + 0.4,
          vx: (Math.random() - 0.5) * 0.15,
          vy: Math.random() * 0.15 + 0.02,
          opacity: baseOpacity,
          baseOpacity,
          flickerOffset: Math.random() * Math.PI * 2,
        };
      });
    }

    let time = 0;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      const cx = canvas.width / 2;
      const cy = canvas.height * 0.55; // Toward the horizon

      for (const p of particles) {
        // Very subtle drift toward center
        const dx = cx - p.x;
        const dy = cy - p.y;
        p.vx += dx * 0.000003;
        p.vy += dy * 0.000003;

        // Tiny random noise
        p.vx += (Math.random() - 0.5) * 0.005;
        p.vy += (Math.random() - 0.5) * 0.005;

        // Friction
        p.vx *= 0.995;
        p.vy *= 0.995;

        p.x += p.vx;
        p.y += p.vy;

        // Flicker opacity
        p.opacity = p.baseOpacity + Math.sin(time * 3 + p.flickerOffset) * 0.15;
        p.opacity = Math.max(0.05, Math.min(0.7, p.opacity));

        // Wrap
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }

        // Color: warm gold/pink near center, cool blue/white on edges
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const proximity = 1 - Math.min(dist / maxDist, 1);

        ctx.save();
        ctx.globalAlpha = p.opacity;

        if (proximity > 0.6) {
          ctx.fillStyle = "#ffe0a0"; // Warm ember
          ctx.shadowColor = "rgba(255, 190, 11, 0.6)";
        } else if (proximity > 0.35) {
          ctx.fillStyle = "#f0a0c0"; // Soft pink
          ctx.shadowColor = "rgba(242, 0, 137, 0.3)";
        } else {
          ctx.fillStyle = "rgba(200, 220, 255, 0.8)"; // Cool white-blue
          ctx.shadowColor = "rgba(200, 220, 255, 0.2)";
        }
        ctx.shadowBlur = p.size * 4;

        // Sharp diamond shape
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    const onResize = () => { resize(); createParticles(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ mixBlendMode: "screen" }}
      aria-hidden="true"
    />
  );
}
