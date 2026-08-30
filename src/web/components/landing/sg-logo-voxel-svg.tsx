"use client";

import { useId } from "react";
import { motion } from "framer-motion";

interface SGVoxelSvgLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

// 120-degree Hexagonal Pixel Blocks
// Left Half: White
const WHITE_BLOCKS = [
  // Top apex (horizontal segment)
  { x: 132, y: 25, w: 12, h: 12 },
  // Top-left diagonal (16x12 pixel steps creating authentic 120° hexagon slope)
  { x: 116, y: 37, w: 16, h: 12 },
  { x: 100, y: 49, w: 16, h: 12 },
  { x: 84, y: 61, w: 16, h: 12 },
  { x: 68, y: 73, w: 16, h: 12 },
  // Left vertical wall
  { x: 56, y: 85, w: 12, h: 90 },
  // Bottom-left diagonal (16x12 pixel steps)
  { x: 68, y: 175, w: 16, h: 12 },
  { x: 84, y: 187, w: 16, h: 12 },
  { x: 100, y: 199, w: 16, h: 12 },
  { x: 116, y: 211, w: 16, h: 12 },
  // Bottom apex
  { x: 132, y: 223, w: 12, h: 12 },
];

// Right Half: Hot Pink
const PINK_BLOCKS = [
  // Top apex (horizontal segment)
  { x: 156, y: 25, w: 12, h: 12 },
  // Top-right diagonal (16x12 pixel steps)
  { x: 168, y: 37, w: 16, h: 12 },
  { x: 184, y: 49, w: 16, h: 12 },
  { x: 200, y: 61, w: 16, h: 12 },
  { x: 216, y: 73, w: 16, h: 12 },
  // Right vertical wall
  { x: 232, y: 85, w: 12, h: 90 },
  // Bottom-right diagonal (16x12 pixel steps)
  { x: 216, y: 175, w: 16, h: 12 },
  { x: 200, y: 187, w: 16, h: 12 },
  { x: 184, y: 199, w: 16, h: 12 },
  { x: 168, y: 211, w: 16, h: 12 },
  // Bottom apex
  { x: 156, y: 223, w: 12, h: 12 },
];

// Top and bottom center divider blocks (Black)
const BLACK_DIVIDER_BLOCKS = [
  { x: 144, y: 25, w: 12, h: 12 },  // Top apex center
  { x: 144, y: 223, w: 12, h: 12 }, // Bottom apex center
];

const BRAND_PINK = "#E6007E";
const BRAND_WHITE = "#FFFFFF";
const BRAND_BLACK = "#000000";

export function SGVoxelSvgLogo({ size = 36, className = "", animate = false }: SGVoxelSvgLogoProps) {
  const filterId = useId().replace(/:/g, "_") + "_sg_shadow";

  // Monogram letter polygon paths inside 300x260 viewBox
  const S_PATH = "M 86 100 H 134 V 114 H 102 V 124 H 134 V 162 H 86 V 148 H 118 V 138 H 86 Z";
  const G_PATH = "M 166 100 H 214 V 114 H 182 V 148 H 200 V 141 H 189 V 127 H 214 V 162 H 166 Z";

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size ? Math.round(size * (260 / 300)) : undefined }}
      animate={animate ? { y: [0, -3, 0] } : undefined}
      transition={animate ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <svg
        width={size}
        height={size ? Math.round(size * (260 / 300)) : undefined}
        viewBox="0 0 300 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Saints Gaming Logo"
        className="w-full h-full overflow-visible select-none"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* PIXEL HEXAGON FRAME (120-DEGREE SYMMETRIC HEXAGON) */}
        {/* Left Side: Pure White Pixel Blocks with Crisp Black Outlines */}
        <g fill={BRAND_WHITE} stroke={BRAND_BLACK} strokeWidth="2.5" strokeLinejoin="miter">
          {WHITE_BLOCKS.map((b, i) => (
            <rect key={`w-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} />
          ))}
        </g>

        {/* Right Side: Hot Pink Pixel Blocks with Crisp Black Outlines */}
        <g fill={BRAND_PINK} stroke={BRAND_BLACK} strokeWidth="2.5" strokeLinejoin="miter">
          {PINK_BLOCKS.map((b, i) => (
            <rect key={`p-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} />
          ))}
        </g>

        {/* Center Apex Divider Blocks: Solid Black */}
        <g fill={BRAND_BLACK} stroke={BRAND_BLACK} strokeWidth="2.5" strokeLinejoin="miter">
          {BLACK_DIVIDER_BLOCKS.map((b, i) => (
            <rect key={`b-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} />
          ))}
        </g>

        {/* INNER SG MONOGRAM (S = Hot Pink, G = Pure White) */}
        <g filter={`url(#${filterId})`}>
          {/* 'S' Letter (Hot Pink with Crisp Black Border) */}
          <path
            d={S_PATH}
            fill={BRAND_PINK}
            stroke={BRAND_BLACK}
            strokeWidth="3.5"
            strokeLinejoin="miter"
            strokeLinecap="square"
          />

          {/* 'G' Letter (Pure White with Crisp Black Border) */}
          <path
            d={G_PATH}
            fill={BRAND_WHITE}
            stroke={BRAND_BLACK}
            strokeWidth="3.5"
            strokeLinejoin="miter"
            strokeLinecap="square"
          />
        </g>
      </svg>
    </motion.div>
  );
}
