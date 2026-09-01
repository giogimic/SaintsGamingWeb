'use client';

import React from 'react';
import { Heart } from 'lucide-react';

interface HeartContainersViewProps {
  hp: number;
  maxHp: number;
  containerCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isRetroPixel?: boolean;
  className?: string;
}

/**
 * Single Animated Heart Container
 * Supports Full (1.0), Half (0.5), and Empty (0.0) states.
 */
export const HeartContainerItem: React.FC<{
  fillRatio: number; // 0 = empty, 0.5 = half, 1 = full
  size?: 'sm' | 'md' | 'lg';
  isPulsing?: boolean;
  isRetro?: boolean;
}> = ({ fillRatio, size = 'md', isPulsing = false, isRetro = false }) => {
  const pixelSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const isFull = fillRatio >= 0.75;
  const isHalf = fillRatio > 0.15 && fillRatio < 0.75;
  const isEmpty = fillRatio <= 0.15;

  return (
    <div
      className={`relative flex items-center justify-center transition-transform select-none ${
        isPulsing ? 'animate-pulse scale-105' : 'hover:scale-110'
      }`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Background/Empty container outline */}
      <svg
        viewBox="0 0 24 24"
        width={pixelSize}
        height={pixelSize}
        className={`absolute inset-0 ${
          isEmpty
            ? 'text-rose-950/70 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]'
            : 'text-red-950/60'
        }`}
        fill="currentColor"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>

      {/* Full or Half Filled Heart Overlay */}
      {!isEmpty && (
        <svg
          viewBox="0 0 24 24"
          width={pixelSize}
          height={pixelSize}
          className="relative z-10 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]"
        >
          <defs>
            <linearGradient id="heartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff4b72" />
              <stop offset="60%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
            <clipPath id="halfClip">
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          </defs>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#heartGradient)"
            clipPath={isHalf ? 'url(#halfClip)' : undefined}
            stroke="#fda4af"
            strokeWidth="0.75"
          />
        </svg>
      )}

      {/* Empty Heart Wireframe Border */}
      <svg
        viewBox="0 0 24 24"
        width={pixelSize}
        height={pixelSize}
        className={`absolute inset-0 pointer-events-none z-20 ${
          isEmpty ? 'text-rose-600/40' : 'text-rose-300/40'
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </div>
  );
};

/**
 * Full Heart Containers Grid Component
 * Displays segmented hearts (like classic Pokémon / Zelda adventure titles)
 */
export const HeartContainersView: React.FC<HeartContainersViewProps> = ({
  hp,
  maxHp,
  containerCount = 10,
  size = 'md',
  showLabel = true,
  isRetroPixel = false,
  className = '',
}) => {
  const safeMax = Math.max(1, maxHp);
  const safeHp = Math.max(0, Math.min(safeMax, hp));
  const hpRatio = safeHp / safeMax;
  const isCritical = hpRatio <= 0.25;

  // Calculate value per heart container
  const hpPerContainer = safeMax / containerCount;
  
  const containers = Array.from({ length: containerCount }).map((_, idx) => {
    const containerFloorHp = idx * hpPerContainer;
    const containerCeilHp = (idx + 1) * hpPerContainer;

    if (safeHp >= containerCeilHp) {
      return 1.0; // Full
    } else if (safeHp <= containerFloorHp) {
      return 0.0; // Empty
    } else {
      // Partial / Half
      const fraction = (safeHp - containerFloorHp) / hpPerContainer;
      return fraction >= 0.5 ? 0.5 : 0.25;
    }
  });

  return (
    <div className={`flex flex-col gap-1.5 w-full select-none ${className}`}>
      {/* Top Header info */}
      {showLabel && (
        <div className="flex items-center justify-between font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center text-rose-400">
              <Heart className="h-3 w-3" fill="currentColor" />
            </span>
            <span className="font-extrabold uppercase tracking-wider text-slate-200">
              HEARTS
            </span>
          </div>
          <span className="font-bold tabular-nums text-rose-300 text-[10px]">
            {safeHp}
            <span className="text-slate-500 font-normal">/{safeMax} HP</span>
          </span>
        </div>
      )}

      {/* Hearts Grid (2 rows of 5 or responsive row) */}
      <div className="p-2 rounded-xl bg-black/60 border border-white/10 shadow-inner flex flex-wrap items-center justify-start gap-1.5">
        {containers.map((ratio, index) => (
          <HeartContainerItem
            key={index}
            fillRatio={ratio}
            size={size}
            isPulsing={isCritical}
            isRetro={isRetroPixel}
          />
        ))}
      </div>
    </div>
  );
};

export default HeartContainersView;
