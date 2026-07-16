"use client";

import React from "react";
import { SGVoxelLogo } from "@/components/landing/sg-logo-true-3d";

/**
 * Standalone 3D Voxel Logo Template
 * 
 * You requested a standalone page to isolate the SG 3D background logo 
 * so it can be easily copied and used as a model for other projects.
 * 
 * To use this in another project:
 * 1. Copy `components/landing/voxel-background.tsx`
 * 2. Ensure you have installed Three.js (`npm install three @types/three @react-three/fiber @react-three/drei`)
 * 3. Use it exactly like the implementation below.
 */
export default function Standalone3DModelPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient lighting/effects (Optional but looks cool) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-black to-black z-0 pointer-events-none" />
      
      {/* Header Info */}
      <div className="absolute top-10 text-center z-10">
        <h1 className="text-3xl font-bold text-white mb-2">Standalone 3D Logo Model</h1>
        <p className="text-zinc-400">Drag to rotate. Scroll to zoom.</p>
      </div>

      {/* 
        The 3D Voxel Container 
        You can size this container to whatever dimensions you need in your project.
        The SGVoxelLogo component will automatically resize to fill the bounds.
      */}
      <div className="w-[80vw] h-[60vh] max-w-[800px] border border-white/10 rounded-xl bg-black/50 shadow-[0_0_50px_rgba(242,0,137,0.2)] z-10">
        <SGVoxelLogo />
      </div>

    </div>
  );
}
