"use client";

import { useEffect, useRef } from "react";


export function VoxelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    
    interface Voxel {
      x: number;
      y: number;
      z: number;      // Fake depth
      size: number;
      speedY: number;
      speedX: number;
      color: { top: string; left: string; right: string };
      opacity: number;
    }
    
    let voxels: Voxel[] = [];

    // V4 Vice City Synthwave colors for the isometric cubes
    const colors = [
      { top: "#00f5d4", left: "#023e8a", right: "#0d0221" }, // Cyan
      { top: "#ffbe0b", left: "#fb5607", right: "#f20089" }, // Gold/Orange/Pink
      { top: "#f20089", left: "#7b2cbf", right: "#3a0ca3" }, // Pink/Purple
    ];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createVoxels() {
      if (!canvas) return;
      const count = Math.floor((canvas.width * canvas.height) / 25000); // adjust density
      voxels = Array.from({ length: Math.min(count, 50) }, () => ({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.6 + Math.random() * (canvas.height * 0.4), // Start near or below horizon
        z: Math.random() * 2, // Used for parallax speed
        size: Math.random() * 12 + 6,
        speedY: -(Math.random() * 1.5 + 0.5), // float up
        speedX: (Math.random() - 0.5) * 0.5, // slight horizontal drift
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.6 + 0.2
      }));
    }

    // Draw an isometric cube
    function drawVoxel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: { top: string, left: string, right: string }, opacity: number) {
      ctx.globalAlpha = opacity;
      
      const dx = size * 0.866; // cos(30)
      const dy = size * 0.5;   // sin(30)

      // Top face
      ctx.fillStyle = color.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y - dy);
      ctx.lineTo(x, y - size);
      ctx.lineTo(x - dx, y - dy);
      ctx.closePath();
      ctx.fill();

      // Left face
      ctx.fillStyle = color.left;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dx, y - dy);
      ctx.lineTo(x - dx, y - dy + size);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();

      // Right face
      ctx.fillStyle = color.right;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y - dy);
      ctx.lineTo(x + dx, y - dy + size);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();
      
      // Wireframe outlines
      ctx.strokeStyle = "rgba(13, 2, 33, 0.6)"; // Dark purple outline
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.globalAlpha = 1.0;
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const v of voxels) {
        // Move
        v.x += v.speedX;
        v.y += v.speedY * (1 + v.z * 0.5); // Parallax: closer ones move faster

        // Wrap around when reaching the top
        if (v.y < -50) {
          v.y = canvas.height + 50;
          v.x = Math.random() * canvas.width;
        }
        if (v.x < -50) v.x = canvas.width + 50;
        if (v.x > canvas.width + 50) v.x = -50;

        // Draw
        drawVoxel(ctx, v.x, v.y, v.size * (1 + v.z * 0.2), v.color, v.opacity);
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    createVoxels();
    animate();

    window.addEventListener("resize", () => {
      resize();
      createVoxels();
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
