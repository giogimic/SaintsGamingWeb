"use client";

import React, { useMemo } from "react";

export function MidnightStars() {
  // Deterministic star field split into 2 twinkling groups
  const { groupA, groupB } = useMemo(() => {
    const a: Array<{ id: number; top: number; left: number; size: number; color: string }> = [];
    const b: Array<{ id: number; top: number; left: number; size: number; color: string }> = [];

    const colors = ["#ffffff", "#e0f7fa", "#e1bee7", "#b2ebf2"];

    for (let i = 0; i < 60; i++) {
      const top = (i * 37) % 55;
      const left = (i * 67 + 13) % 100;
      const size = i % 4 === 0 ? 2.5 : i % 2 === 0 ? 1.5 : 1.0;
      const color = colors[i % colors.length];

      if (i % 2 === 0) {
        a.push({ id: i, top, left, size, color });
      } else {
        b.push({ id: i, top, left, size, color });
      }
    }

    return { groupA: a, groupB: b };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[15] overflow-hidden select-none">
      <style>{`
        @keyframes sgStarTwinkleA {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.95; }
        }
        @keyframes sgStarTwinkleB {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0.3; }
        }
        @keyframes sgShootingStar {
          0% { transform: translate3d(-200px, -100px, 0) rotate(-25deg); opacity: 0; }
          15% { opacity: 1; }
          30% { transform: translate3d(500px, 250px, 0) rotate(-25deg); opacity: 0; }
          100% { transform: translate3d(500px, 250px, 0) rotate(-25deg); opacity: 0; }
        }
      `}</style>

      {/* Group A Stars */}
      <svg
        className="w-full h-full absolute inset-0"
        style={{
          animation: 'sgStarTwinkleA 3.5s ease-in-out infinite',
          willChange: 'opacity',
        }}
      >
        {groupA.map((s) => (
          <circle
            key={s.id}
            cx={`${s.left}%`}
            cy={`${s.top}%`}
            r={s.size}
            fill={s.color}
          />
        ))}
      </svg>

      {/* Group B Stars */}
      <svg
        className="w-full h-full absolute inset-0"
        style={{
          animation: 'sgStarTwinkleB 4.2s ease-in-out infinite',
          willChange: 'opacity',
        }}
      >
        {groupB.map((s) => (
          <circle
            key={s.id}
            cx={`${s.left}%`}
            cy={`${s.top}%`}
            r={s.size}
            fill={s.color}
          />
        ))}
      </svg>

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
