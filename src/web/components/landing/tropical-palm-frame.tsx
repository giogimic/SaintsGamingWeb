"use client";

import React from "react";
import { motion } from "framer-motion";

export function TropicalPalmFrame({
  glowColor = "rgba(248, 150, 30, 0.4)",
}: {
  glowColor?: string;
  color?: string;
  rimColor?: string;
  shorelineColor?: string;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 select-none max-sm:hidden" style={{ pointerEvents: "none", userSelect: "none" }}>
      {/* ── Left Palm Vector Silhouette ─────────────────────────────── */}
      <motion.div
        className="absolute bottom-0 left-0 w-[38vw] max-w-[540px] h-[58vh] sm:h-[62vh] min-w-[240px] pointer-events-none select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, rotate: [0.3, -0.3, 0.3] }}
        transition={{
          opacity: { duration: 0.6 },
          rotate: { duration: 9, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformOrigin: "0% 100%", pointerEvents: "none", userSelect: "none" }}
      >
        <img
          src="/images/left-palm.svg"
          alt="Left Palm Silhouette Frame"
          draggable={false}
          className="w-full h-full object-contain object-left-bottom pointer-events-none select-none"
          style={{
            filter: `drop-shadow(4px 0 25px rgba(0,0,0,0.85)) drop-shadow(0 0 14px ${glowColor})`,
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserDrag: "none",
          } as React.CSSProperties}
        />
      </motion.div>

      {/* ── Right Palm Vector Silhouette (Enlarged +30%) ────────────── */}
      <motion.div
        className="absolute bottom-0 right-0 w-[44vw] max-w-[630px] h-[75vh] sm:h-[80vh] min-w-[285px] pointer-events-none select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, rotate: [-0.3, 0.3, -0.3] }}
        transition={{
          opacity: { duration: 0.6 },
          rotate: { duration: 9.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
        }}
        style={{ transformOrigin: "100% 100%", pointerEvents: "none", userSelect: "none" }}
      >
        <img
          src="/images/right-palm.svg"
          alt="Right Palm Silhouette Frame"
          draggable={false}
          className="w-full h-full object-contain object-right-bottom pointer-events-none select-none"
          style={{
            filter: `drop-shadow(-4px 0 25px rgba(0,0,0,0.85)) drop-shadow(0 0 14px ${glowColor})`,
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserDrag: "none",
          } as React.CSSProperties}
        />
      </motion.div>
    </div>
  );
}
