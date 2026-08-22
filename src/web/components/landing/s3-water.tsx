"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

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
      {/* ── Base Water Gradient ─────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #f8961e 0%, #f72585 15%, #7209b7 50%, #240046 100%)",
        }}
      />

      {/* ── Horizon Sun Reflection Column (Gentle Breathing Glow) ──── */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[55vw] max-w-[550px] h-full opacity-90 mix-blend-overlay"
        animate={{
          scaleX: [1, 1.04, 0.97, 1],
          opacity: [0.85, 0.96, 0.85],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, #f9c74f 0%, #f8961e 30%, transparent 80%)",
        }}
      />
      
      {/* Bright core sun reflection right below sun disc */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[22vw] max-w-[220px] h-[65%]"
        animate={{
          opacity: [0.75, 0.95, 0.75],
          scaleY: [1, 1.03, 1],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255, 255, 255, 0.85) 0%, rgba(249, 199, 79, 0.6) 40%, transparent 100%)",
          filter: "blur(4px)",
        }}
      />

      {/* ── Clean, Small Horizontal Specular Glints ─────────────────── */}
      {glitters.map((g) => (
        <motion.div
          key={g.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: `${g.y}%`,
            left: `${g.x}%`,
            width: `${g.width}px`,
            height: `${g.height}px`,
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(ellipse at 50% 50%, #ffffff 0%, #ffe066 50%, rgba(248,150,30,0) 100%)",
            boxShadow: "0 0 5px rgba(255,224,102,0.85)",
          }}
          animate={{
            opacity: [0.15, 0.85, 0.2],
            scaleX: [0.85, 1.2, 0.85],
            x: ["-3px", "3px", "-3px"],
          }}
          transition={{
            duration: g.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: g.delay,
          }}
        />
      ))}
      
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
