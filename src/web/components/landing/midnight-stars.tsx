"use client";

import React, { useMemo } from "react";

export function MidnightStars() {
  // Deterministic star field
  const stars = useMemo(() => {
    return Array.from({ length: 75 }).map((_, i) => {
      // Keep stars mostly in the upper 55% of the viewport (the sky above mountains)
      const top = Math.random() * 55;
      const left = Math.random() * 100;
      const size = Math.random() < 0.65 ? 1.5 : Math.random() < 0.9 ? 2.5 : 3.5;
      const duration = 2.5 + (i % 6) * 0.7;
      const delay = (i * 0.35) % 4;
      const isCross = size > 3.0 && i % 3 === 0;

      const colors = ["#ffffff", "#e0f7fa", "#e1bee7", "#b2ebf2"];
      const color = colors[i % colors.length];

      return { id: i, top, left, size, duration, delay, isCross, color };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[15] overflow-hidden select-none">
      <style>{`
        @keyframes sgStarTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8) translateZ(0); }
          50% { opacity: 0.95; transform: scale(1.25) translateZ(0); }
        }
        @keyframes sgShootingStar {
          0% { transform: translate3d(-200px, -100px, 0) rotate(-25deg); opacity: 0; }
          15% { opacity: 1; }
          30% { transform: translate3d(500px, 250px, 0) rotate(-25deg); opacity: 0; }
          100% { transform: translate3d(500px, 250px, 0) rotate(-25deg); opacity: 0; }
        }
      `}</style>

      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: s.color,
            boxShadow: `0 0 ${s.size * 2}px ${s.color}, 0 0 ${s.size * 4}px rgba(0, 245, 212, 0.4)`,
            animation: `sgStarTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            willChange: 'opacity, transform',
          }}
        >
          {/* Subtle 4-point sparkle cross on larger stars */}
          {s.isCross && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12px] h-[12px] pointer-events-none opacity-60"
              style={{
                background:
                  "radial-gradient(circle, #ffffff 10%, rgba(0,245,212,0.8) 30%, transparent 70%)",
                clipPath:
                  "polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)",
              }}
            />
          )}
        </div>
      ))}

      {/* ── Occasional Shooting Star ─────────────────────────────────── */}
      <div
        className="absolute w-[120px] h-[1.5px] rounded-full pointer-events-none"
        style={{
          top: "15%",
          left: "25%",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,245,212,0.8) 50%, #ffffff 100%)",
          boxShadow: "0 0 8px #00f5d4",
          animation: "sgShootingStar 10.8s ease-out infinite",
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
}
