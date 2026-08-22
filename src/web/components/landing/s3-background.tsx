"use client";

import React from "react";
import { motion } from "framer-motion";

export function S3Background({ sunClassName = "top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2" }: { sunClassName?: string }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* ── Dreamy Sky Gradient ─────────────────────────────────────── */}
      {/* Deep purple/pink at top -> magenta -> warm orange -> golden yellow at horizon */}
      <div
        className="absolute top-0 left-0 w-full h-[65vh]"
        style={{
          background:
            "linear-gradient(to bottom, #5a189a 0%, #b5179e 30%, #f72585 55%, #f8961e 85%, #f9c74f 100%)",
        }}
      />

      {/* ── Intense Glowing Sun ─────────────────────────────────────── */}
      {/* Brightest, warmest focal point in the center distance */}
      <div className={`absolute flex justify-center items-center ${sunClassName}`}>
        {/* Outer immense hazy bloom */}
        <div
          className="absolute w-[80vw] h-[60vh] max-w-[800px] rounded-full opacity-60 mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at 50% 100%, rgba(249, 199, 79, 0.5) 0%, rgba(248, 150, 30, 0.3) 30%, rgba(247, 37, 133, 0.1) 60%, transparent 80%)",
          }}
        />
        {/* Core sun bloom */}
        <div
          className="absolute w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full opacity-80 mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at 50% 100%, rgba(255, 235, 150, 1) 0%, rgba(249, 199, 79, 0.8) 20%, rgba(248, 150, 30, 0) 70%)",
          }}
        />
        {/* Solid sun disc (partially hidden by horizon) */}
        <div
          className="absolute bottom-0 w-[12vw] h-[12vw] max-w-[120px] max-h-[120px] rounded-full"
          style={{
            background: "radial-gradient(circle, #ffffff 0%, #fff3b0 50%, #f9c74f 100%)",
            boxShadow: "0 0 40px #f9c74f, 0 0 80px #f8961e",
          }}
        />
      </div>

      {/* ── Distant Mountains / Haze ────────────────────────────────── */}
      {/* Layer 1: Furthest, lightest haze */}
      <svg
        className="absolute top-[65%] left-0 w-full h-[15vh] -translate-y-full opacity-40"
        preserveAspectRatio="none"
        viewBox="0 0 1000 100"
      >
        <path
          d="M0,100 L0,50 Q100,40 200,60 T400,30 T600,50 T800,20 T1000,45 L1000,100 Z"
          fill="#c9184a"
        />
      </svg>

      {/* Layer 2: Mid-distance silhouettes */}
      <svg
        className="absolute top-[65%] left-0 w-full h-[12vh] -translate-y-full opacity-60"
        preserveAspectRatio="none"
        viewBox="0 0 1000 100"
      >
        <path
          d="M0,100 L0,70 Q150,50 250,80 T500,40 T750,70 T1000,50 L1000,100 Z"
          fill="#7b2cbf"
        />
      </svg>

      {/* Layer 3: Closer, darker silhouettes */}
      <svg
        className="absolute top-[65%] left-0 w-full h-[8vh] -translate-y-full opacity-80"
        preserveAspectRatio="none"
        viewBox="0 0 1000 100"
      >
        <path
          d="M0,100 L0,80 Q100,70 150,90 T350,60 T600,85 T850,70 T1000,85 L1000,100 Z"
          fill="#3c096c"
        />
      </svg>
      
      {/* ── Ferris Wheel Removed ─────── */}
    </div>
  );
}
