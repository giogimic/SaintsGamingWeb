'use client';

import React from 'react';
import { Heart, Droplet, Zap } from 'lucide-react';

export type VitalIconType = 'heart' | 'droplet' | 'zap';

interface IconContainersViewProps {
  vitalType: VitalIconType;
  label: string;
  value: number;
  maxValue: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  baseColorClass: string;       // e.g. 'text-rose-500'
  baseGradientStart: string;    // e.g. '#ff4b72'
  baseGradientMid: string;      // e.g. '#e11d48'
  baseGradientEnd: string;      // e.g. '#9f1239'
  emptyColorClass: string;      // e.g. 'text-rose-950/70'
}

// 1 icon = 25 units
const UNITS_PER_ICON = 25;
const MAX_ICONS = 8;
const UNITS_PER_TIER = MAX_ICONS * UNITS_PER_ICON; // 200

// Tier gradient definitions (Base is index 0, provided via props)
const TIER_COLORS = [
  // Tier 1: Silver
  { start: '#e2e8f0', mid: '#94a3b8', end: '#475569', stroke: '#f8fafc' },
  // Tier 2: Gold
  { start: '#fef08a', mid: '#eab308', end: '#a16207', stroke: '#fef9c3' },
  // Tier 3: Diamond
  { start: '#67e8f9', mid: '#06b6d4', end: '#0e7490', stroke: '#cffafe' },
  // Tier 4: Amethyst
  { start: '#e879f9', mid: '#d946ef', end: '#86198f', stroke: '#fae8ff' },
];

export const VitalIconItem: React.FC<{
  vitalType: VitalIconType;
  fillRatio: number; // 0 to 1
  tier: number; // 0 = base, 1 = silver, 2 = gold, etc.
  size?: 'sm' | 'md' | 'lg';
  isPulsing?: boolean;
  baseGradientStart: string;
  baseGradientMid: string;
  baseGradientEnd: string;
  emptyColorClass: string;
}> = ({
  vitalType,
  fillRatio,
  tier,
  size = 'md',
  isPulsing = false,
  baseGradientStart,
  baseGradientMid,
  baseGradientEnd,
  emptyColorClass,
}) => {
  const pixelSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const isHalf = fillRatio > 0.25 && fillRatio < 0.75;
  const isEmpty = fillRatio <= 0.05;

  const gradientId = `grad-${vitalType}-${tier}`;
  const clipId = `clip-${vitalType}-${tier}`;

  // Determine colors based on tier
  let gStart = baseGradientStart;
  let gMid = baseGradientMid;
  let gEnd = baseGradientEnd;
  let gStroke = '#ffffff';

  if (tier > 0) {
    const tierDef = TIER_COLORS[Math.min(tier - 1, TIER_COLORS.length - 1)];
    gStart = tierDef.start;
    gMid = tierDef.mid;
    gEnd = tierDef.end;
    gStroke = tierDef.stroke;
  }

  // Choose the SVG path based on vital type
  const getPath = () => {
    switch (vitalType) {
      case 'heart':
        return "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
      case 'droplet':
        return "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z";
      case 'zap':
        return "M13 2L3 14h9l-1 8 10-12h-9l1-8z";
      default:
        return "";
    }
  };

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
        className={`absolute inset-0 ${emptyColorClass}`}
        fill="currentColor"
      >
        <path d={getPath()} />
      </svg>

      {/* Full or Half Filled Overlay */}
      {!isEmpty && (
        <svg
          viewBox="0 0 24 24"
          width={pixelSize}
          height={pixelSize}
          className="relative z-10 drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gStart} />
              <stop offset="60%" stopColor={gMid} />
              <stop offset="100%" stopColor={gEnd} />
            </linearGradient>
            <clipPath id={clipId}>
              {vitalType === 'zap' ? (
                // Horizontal clip for lightning bolt (it's often better to clip vertically, but we'll use rect)
                <rect x="0" y="0" width={isHalf ? "12" : "24"} height="24" />
              ) : (
                <rect x="0" y="0" width={isHalf ? "12" : "24"} height="24" />
              )}
            </clipPath>
          </defs>
          <path
            d={getPath()}
            fill={`url(#${gradientId})`}
            clipPath={isHalf ? `url(#${clipId})` : undefined}
            stroke={gStroke}
            strokeWidth="0.75"
          />
        </svg>
      )}

      {/* Empty Wireframe Border */}
      <svg
        viewBox="0 0 24 24"
        width={pixelSize}
        height={pixelSize}
        className={`absolute inset-0 pointer-events-none z-20 opacity-50`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        <path d={getPath()} />
      </svg>
    </div>
  );
};

export const IconContainersView: React.FC<IconContainersViewProps> = ({
  vitalType,
  label,
  value,
  maxValue,
  size = 'md',
  showLabel = true,
  className = '',
  baseColorClass,
  baseGradientStart,
  baseGradientMid,
  baseGradientEnd,
  emptyColorClass,
}) => {
  const safeValue = Math.max(0, value);
  const isCritical = safeValue <= (maxValue * 0.25) && vitalType === 'heart';

  // Determine base tier and next tier based on current value
  const baseTier = Math.floor(safeValue / UNITS_PER_TIER);
  const nextTier = baseTier + 1;
  const remainderValue = safeValue % UNITS_PER_TIER;

  // We always render exactly MAX_ICONS (e.g. 8) containers on screen.
  // Those that fall under the remainder get the nextTier color.
  // Those that are above the remainder get the baseTier color.
  
  const containers = Array.from({ length: MAX_ICONS }).map((_, idx) => {
    const containerFloor = idx * UNITS_PER_ICON;
    const containerCeil = (idx + 1) * UNITS_PER_ICON;

    let tierToUse = baseTier;
    let fillRatio = 1.0;

    if (remainderValue > containerFloor) {
      // This icon has some value from the next tier
      tierToUse = nextTier;
      if (remainderValue >= containerCeil) {
        fillRatio = 1.0; // Full next tier
      } else {
        // Partial next tier
        const fraction = (remainderValue - containerFloor) / UNITS_PER_ICON;
        fillRatio = fraction >= 0.5 ? 0.5 : 0.0;
        // If the next tier is empty for this icon, it should show the full base tier!
        if (fillRatio === 0.0) {
          tierToUse = baseTier;
          fillRatio = 1.0; // Show full underlying tier
        }
      }
    } else {
      // This icon is purely in the base tier.
      // If baseTier is 0 and we haven't filled it, it might be empty or partial.
      if (baseTier === 0) {
        if (safeValue <= containerFloor) {
          fillRatio = 0.0; // Empty base tier
        } else if (safeValue < containerCeil) {
          const fraction = (safeValue - containerFloor) / UNITS_PER_ICON;
          fillRatio = fraction >= 0.5 ? 0.5 : 0.0;
        } else {
          fillRatio = 1.0;
        }
      } else {
        // If baseTier > 0, the underlying tier is completely full.
        fillRatio = 1.0;
      }
    }

    return { tier: tierToUse, fillRatio };
  });

  const IconComponent = vitalType === 'heart' ? Heart : vitalType === 'droplet' ? Droplet : Zap;

  return (
    <div className={`flex flex-col gap-1.5 w-full select-none ${className}`}>
      {/* Top Header info */}
      {showLabel && (
        <div className="flex items-center justify-between font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className={`flex h-3.5 w-3.5 items-center justify-center ${baseColorClass}`}>
              <IconComponent className="h-3 w-3" fill="currentColor" />
            </span>
            <span className="font-extrabold uppercase tracking-wider text-slate-200">
              {label}
            </span>
          </div>
          <span className={`font-bold tabular-nums ${baseColorClass} text-[10px]`}>
            {safeValue}
            <span className="text-slate-500 font-normal">/{maxValue}</span>
          </span>
        </div>
      )}

      {/* Icons Grid */}
      <div className="p-2 rounded-xl bg-black/60 border border-white/10 shadow-inner flex flex-wrap items-center justify-start gap-1.5">
        {containers.map((data, index) => (
          <VitalIconItem
            key={index}
            vitalType={vitalType}
            fillRatio={data.fillRatio}
            tier={data.tier}
            size={size}
            isPulsing={isCritical}
            baseGradientStart={baseGradientStart}
            baseGradientMid={baseGradientMid}
            baseGradientEnd={baseGradientEnd}
            emptyColorClass={emptyColorClass}
          />
        ))}
      </div>
    </div>
  );
};

export default IconContainersView;
