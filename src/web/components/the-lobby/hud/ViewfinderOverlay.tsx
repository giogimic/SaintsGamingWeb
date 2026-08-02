"use client";

import { useGameStore } from "../store";

/**
 * Subtle camera-grid overlay while Viewfinder Edit Mode is active.
 * Communicates that the HUD is unlocked without blocking interaction.
 */
export function ViewfinderOverlay() {
  const active = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);
  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90]"
      aria-hidden
    >
      {/* Hex / aperture grid */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.35) 1px, transparent 1px),
            radial-gradient(circle at center, transparent 38%, rgba(139,92,246,0.12) 72%, rgba(10,11,16,0.35) 100%)
          `,
          backgroundSize: "48px 48px, 48px 48px, 100% 100%",
        }}
      />
      {/* Crosshair reticle */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="relative h-40 w-40">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#10B981]" />
          <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[#10B981]" />
          <div className="absolute inset-4 rounded-full border border-[#10B981]/60" />
          <div className="absolute inset-[28%] rounded-full border border-[#8B5CF6]/50" />
        </div>
      </div>
      {/* Corner brackets */}
      <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-[#10B981]/50" />
      <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-[#10B981]/50" />
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-[#10B981]/50" />
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-[#10B981]/50" />
    </div>
  );
}
