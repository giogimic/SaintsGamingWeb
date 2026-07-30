"use client";

import { useEffect, useRef } from "react";

export function LeavesBackgroundV5() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    
    interface Leaf {
      x: number;
      y: number;
      z: number;      
      size: number;
      speedY: number;
      speedX: number;
      angle: number;
      rotationSpeed: number;
      color: string;
      opacity: number;
    }
    
    let leaves: Leaf[] = [];

    // V4 Vice City Synthwave colors for the falling leaves -> Changed to Black Shadows per request
    const colors = [
      "#000000",
      "#050505",
      "#0a0a0a",
      "#111111",
    ];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createLeaves() {
      if (!canvas) return;
      const count = Math.floor((canvas.width * canvas.height) / 15000); 
      leaves = Array.from({ length: Math.min(count, 80) }, () => {
        const size = Math.random() * 25 + 5;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height, // Start above the screen
          z: Math.random() * 2, 
          size: size,
          speedY: (Math.random() * 0.4 + 0.1), // Slow down!
          speedX: (Math.random() - 0.5) * 0.5, // Wind drifting
          angle: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.5 + 0.2
        }
      });
    }

    // Draw an abstract synthwave leaf (sleek diamond/petal shape)
    function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, color: string, opacity: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = opacity;
      
      if (size > 22) {
        ctx.filter = "blur(3px)";
      } else if (size > 15) {
        ctx.filter = "blur(1.5px)";
      }
      
      // We'll create a subtle dark shadow instead of a bright neon glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      
      ctx.fillStyle = color;
      
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(size * 0.6, 0, 0, size);
      ctx.quadraticCurveTo(-size * 0.6, 0, 0, -size);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const leaf of leaves) {
        // Move
        leaf.x += leaf.speedX + Math.sin(leaf.y * 0.01) * 0.5; // Fluttering motion
        leaf.y += leaf.speedY * (1 + leaf.z * 0.5); 
        leaf.angle += leaf.rotationSpeed;

        // Wrap around when reaching the bottom
        if (leaf.y > canvas.height + 50) {
          leaf.y = -50;
          leaf.x = Math.random() * canvas.width;
        }
        if (leaf.x < -50) leaf.x = canvas.width + 50;
        if (leaf.x > canvas.width + 50) leaf.x = -50;

        // Draw
        drawLeaf(ctx, leaf.x, leaf.y, leaf.size * (1 + leaf.z * 0.2), leaf.angle, leaf.color, leaf.opacity);
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    createLeaves();
    animate();

    window.addEventListener("resize", () => {
      resize();
      createLeaves();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      aria-hidden="true"
    />
  );
}
