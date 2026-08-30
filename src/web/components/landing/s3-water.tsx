"use client";

import React, { useMemo } from "react";

export function S3Water() {
  // Clean, small horizontal specular light dashes on the water
  const glitters = useMemo(() => {
    return Array.from({ length: 36 }).map((_, i) => {
      const progress = (i + 1) / 36;
      const y = Math.pow(progress, 1.9) * 85 + 6;
      const xSpread = 8 + progress * 22;
      const x = 50 + Math.sin(i * 791) * xSpread;
      const width = 6 + progress * 16; // Small, clean horizontal dashes (6px - 22px)
      const height = Math.max(1.2, progress * 2.2);
      const duration = 2.0 + (i % 5) * 0.5;
      const delay = (i * 0.28) % 2.5;

      return { id: i, x, y, width, height, duration, delay };
    });
  }, []);

  return (
    <div className="absolute bottom-0 left-0 w-full h-[35vh] overflow-hidden pointer-events-none z-10 select-none">
      <style>{`
        @keyframes sgWaterBreathGlow {
          0%, 100% { transform: translate(-50%, 0) scaleX(1); opacity: 0.85; }
          50% { transform: translate(-50%, 0) scaleX(1.04); opacity: 0.96; }
        }
        @keyframes sgWaterSunCore {
          0%, 100% { transform: translate(-50%, 0) scaleY(1); opacity: 0.75; }
          50% { transform: translate(-50%, 0) scaleY(1.03); opacity: 0.95; }
        }
        @keyframes sgWaterGlint {
          0%, 100% { transform: translate(calc(-50% - 3px), -50%) scaleX(0.85); opacity: 0.15; }
          50% { transform: translate(calc(-50% + 3px), -50%) scaleX(1.2); opacity: 0.85; }
        }
      `}</style>

      {/* ── Base Water Gradient ─────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #f8961e 0%, #f72585 15%, #7209b7 50%, #240046 100%)",
        }}
      />

      {/* ── Horizon Sun Reflection Column (Gentle Breathing Glow) ──── */}
      <div
        className="absolute top-0 left-1/2 w-[55vw] max-w-[550px] h-full mix-blend-overlay pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, #f9c74f 0%, #f8961e 30%, transparent 80%)",
          animation: "sgWaterBreathGlow 6s ease-in-out infinite",
          willChange: 'transform, opacity',
        }}
      />
      
      {/* Bright core sun reflection right below sun disc */}
      <div
        className="absolute top-0 left-1/2 w-[22vw] max-w-[220px] h-[65%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255, 255, 255, 0.85) 0%, rgba(249, 199, 79, 0.6) 40%, transparent 100%)",
          filter: "blur(4px)",
          animation: "sgWaterSunCore 4.5s ease-in-out infinite",
          willChange: 'transform, opacity',
        }}
      />

      {/* ── Grouped Specular Glints in SVG layers ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          animation: 'sgWaterBreathGlow 3.6s ease-in-out infinite',
          willChange: 'opacity',
        }}
      >
        <defs>
          <radialGradient id="glintGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#ffe066" />
            <stop offset="100%" stopColor="#f8961e" stopOpacity="0" />
          </radialGradient>
        </defs>
        {glitters.map((g) => (
          <ellipse
            key={g.id}
            cx={`${g.x}%`}
            cy={`${g.y}%`}
            rx={g.width / 2}
            ry={g.height / 2}
            fill="url(#glintGrad)"
          />
        ))}
      </svg>
      
      {/* ── Soft Vignette / Corner Depth ────────────────────────────── */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 120% at 50% 0%, transparent 45%, rgba(16,0,43,0.85) 100%)"
        }}
      />
    </div>
  );
}
