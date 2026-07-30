"use client";

import { motion } from "framer-motion";

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-background">
      {/* Dark texture overlay for noise (optional, using CSS radial-gradient) */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
        style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}
      />

      {/* Gold Orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 dark:opacity-30"
        style={{ background: "radial-gradient(circle, var(--color-sg-gold) 0%, transparent 70%)" }}
        animate={{
          x: ["-10%", "20%", "-10%"],
          y: ["-20%", "30%", "-20%"],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Purple Orb */}
      <motion.div
        className="absolute right-0 top-1/4 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 dark:opacity-30"
        style={{ background: "radial-gradient(circle, var(--color-sg-purple) 0%, transparent 70%)" }}
        animate={{
          x: ["20%", "-10%", "20%"],
          y: ["30%", "-10%", "30%"],
          scale: [1.2, 1, 1.2],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Blue Orb (Bottom) */}
      <motion.div
        className="absolute left-1/4 bottom-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 dark:opacity-20"
        style={{ background: "radial-gradient(circle, var(--color-sg-blue) 0%, transparent 70%)" }}
        animate={{
          x: ["0%", "30%", "0%"],
          y: ["20%", "-20%", "20%"],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
