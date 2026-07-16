"use client";

// Cinematic Vignette V5 — Heavy dark frame, no foliage shapes
// Pure darkness around the edges opening to the bright center

import React from 'react';

export function PalmCanopyVignetteV5() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
      {/* Heavy radial vignette */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 65% 60% at 50% 55%, transparent 0%, rgba(3,0,16,0.3) 40%, rgba(3,0,16,0.75) 65%, rgba(3,0,16,0.97) 100%)"
      }} />

      {/* Top bleed */}
      <div className="absolute top-0 left-0 w-full h-[15vh]" style={{
        background: "linear-gradient(to bottom, rgba(3,0,16,0.95) 0%, rgba(3,0,16,0.4) 60%, transparent 100%)"
      }} />

      {/* Bottom corner fills */}
      <div className="absolute bottom-0 left-0 w-[25vw] h-[20vh]" style={{
        background: "linear-gradient(to top right, rgba(3,0,16,0.7) 0%, transparent 100%)"
      }} />
      <div className="absolute bottom-0 right-0 w-[25vw] h-[20vh]" style={{
        background: "linear-gradient(to top left, rgba(3,0,16,0.7) 0%, transparent 100%)"
      }} />
    </div>
  );
}
