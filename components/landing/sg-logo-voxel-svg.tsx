"use client";

import { motion } from "framer-motion";

interface SGVoxelSvgLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function SGVoxelSvgLogo({ size = 36, className = "", animate = false }: SGVoxelSvgLogoProps) {
  const S_COLOR = "#f20089"; // Pink
  const G_COLOR = "#ffffff"; // White
  
  // Isometric block rendering function
  // We simulate the voxel look with a flat 2D grid of squares for crisp rendering
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      animate={animate ? { y: [0, -4, 0] } : undefined}
      transition={animate ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Saints Gaming Voxel Logo"
        className="drop-shadow-md"
      >
        {/* 'S' Letter Blocks (Left) */}
        <g fill={S_COLOR}>
          {/* Top row */}
          <rect x="2" y="4.5" width="2.5" height="2.5" />
          <rect x="5" y="4.5" width="2.5" height="2.5" />
          <rect x="8" y="4.5" width="2.5" height="2.5" />
          
          {/* Upper drop */}
          <rect x="2" y="7.5" width="2.5" height="2.5" />
          
          {/* Middle row */}
          <rect x="2" y="10.5" width="2.5" height="2.5" />
          <rect x="5" y="10.5" width="2.5" height="2.5" />
          <rect x="8" y="10.5" width="2.5" height="2.5" />
          
          {/* Lower drop */}
          <rect x="8" y="13.5" width="2.5" height="2.5" />
          
          {/* Bottom row */}
          <rect x="2" y="16.5" width="2.5" height="2.5" />
          <rect x="5" y="16.5" width="2.5" height="2.5" />
          <rect x="8" y="16.5" width="2.5" height="2.5" />
        </g>

        {/* 'G' Letter Blocks (Right) */}
        <g fill={G_COLOR}>
          {/* Top row */}
          <rect x="14" y="4.5" width="2.5" height="2.5" />
          <rect x="17" y="4.5" width="2.5" height="2.5" />
          <rect x="20" y="4.5" width="2.5" height="2.5" />
          
          {/* Upper drop */}
          <rect x="14" y="7.5" width="2.5" height="2.5" />
          
          {/* Middle row (Empty center to prevent looking like a 6) */}
          <rect x="14" y="10.5" width="2.5" height="2.5" />
          <rect x="20" y="10.5" width="2.5" height="2.5" />
          
          {/* Lower drop (Both sides for G loop) */}
          <rect x="14" y="13.5" width="2.5" height="2.5" />
          <rect x="20" y="13.5" width="2.5" height="2.5" />
          
          {/* Bottom row */}
          <rect x="14" y="16.5" width="2.5" height="2.5" />
          <rect x="17" y="16.5" width="2.5" height="2.5" />
          <rect x="20" y="16.5" width="2.5" height="2.5" />
        </g>
      </svg>
    </motion.div>
  );
}
