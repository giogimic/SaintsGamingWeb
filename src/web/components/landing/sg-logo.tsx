"use client";

import { motion } from "framer-motion";

interface SGLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function SGLogo({ size = 280, className = "", animate = true }: SGLogoProps) {
  const pathVariants = {
    hidden: { pathLength: animate ? 0 : 1, opacity: animate ? 0 : 1 },
    visible: (delay: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 2.5, delay: animate ? delay : 0, ease: "easeInOut" as const },
        opacity: { duration: 0.5, delay: animate ? delay : 0 },
      },
    }),
  };

  return (
    <motion.div
      className={`sg-glow ${className}`}
      animate={animate ? { rotate: 360 } : undefined}
      transition={animate ? {
        duration: 50,
        repeat: Infinity,
        ease: "linear",
      } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Saints Gaming Logo"
      >
        <defs>
          <linearGradient id="sg-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.8 0.15 220)" />
            <stop offset="50%" stopColor="oklch(0.7 0.18 240)" />
            <stop offset="100%" stopColor="oklch(0.6 0.2 260)" />
          </linearGradient>

          <filter id="sg-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Halo Borders (Constant) */}
        <motion.g filter="url(#sg-glow-filter)">
          <motion.circle 
            cx="100" cy="100" r="75" 
            stroke="url(#sg-primary)" strokeWidth="2" fill="none" 
            variants={pathVariants} initial="hidden" animate="visible" 
          />
          <motion.circle 
            cx="100" cy="100" r="65" 
            stroke="url(#sg-primary)" strokeWidth="1" fill="none" strokeDasharray="4 8" 
            variants={pathVariants} initial="hidden" animate="visible" custom={0.2} 
          />
          
          {/* Finalized Font: Ultra Monoline (Scaled down slightly) */}
          <motion.g 
            stroke="url(#sg-primary)" 
            strokeWidth="3" 
            fill="none" 
            strokeLinejoin="round" 
            strokeLinecap="round"
            style={{ transform: "scale(0.85)", transformOrigin: "100px 100px" }}
          >
            <motion.path 
              d="M 95 50 H 50 V 100 H 95 V 150 H 50" 
              variants={pathVariants} initial="hidden" animate="visible" custom={0.3} 
            />
            <motion.path 
              d="M 150 80 V 50 H 105 V 150 H 150 V 100 H 125" 
              variants={pathVariants} initial="hidden" animate="visible" custom={0.5} 
            />
            {/* Extended Monoline Underline & Overline */}
            <motion.path 
              d="M 45 45 H 155 M 45 155 H 155" 
              strokeWidth="1" strokeDasharray="4 8" 
              variants={pathVariants} initial="hidden" animate="visible" custom={0.7} 
            />
          </motion.g>
        </motion.g>
      </svg>
    </motion.div>
  );
}
