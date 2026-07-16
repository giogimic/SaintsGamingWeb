"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { SGVoxelLogo } from "@/components/landing/sg-logo-true-3d";
import { getDiscordInviteUrl } from "./actions/settings";
import { PalmCanopyVignetteV5 } from "@/components/landing/palm-canopy-vignette-v5";
import { DigitalSnowV5 } from "@/components/landing/digital-snow-v5";

// ── Theme color palettes ──────────────────────────────────────────
// Each theme defines the colors used across the landing page.
// "hacker" is the primary/default. Others are ready for future customization.
const THEME_PALETTES = {
  hacker: {
    bg: "#0d0221",
    skyGradient: "linear-gradient(to bottom, #0d0221 0%, #3a0ca3 45%, #f20089 100%)",
    gridColor: "#f20089",
    sunGradient: "linear-gradient(180deg, #ffbe0b 0%, #fb5607 40%, #ff006e 100%)",
    sunGlow: "radial-gradient(ellipse at 50% 100%, #fb5607 0%, #f20089 50%, transparent 70%)",
    groundGlow: "radial-gradient(ellipse at 50% 0%, #fb5607 0%, #f20089 40%, transparent 70%)",
    textColor: "#00f5d4",
    accentColor: "#ffbe0b",
    btnBg: "#f20089",
    btnBorder: "#ffbe0b",
    btnGlow: "#f20089",
    btn2Border: "#00f5d4",
    btn2Text: "#00f5d4",
    logoGlow: "rgba(242,0,137,0.6)",
    navText: "#f20089",
    navHover: "#00f5d4",
  },
  dark: {
    bg: "#0d0221",
    skyGradient: "linear-gradient(to bottom, #0d0221 0%, #3a0ca3 45%, #f20089 100%)",
    gridColor: "#f20089",
    sunGradient: "linear-gradient(180deg, #ffbe0b 0%, #fb5607 40%, #ff006e 100%)",
    sunGlow: "radial-gradient(ellipse at 50% 100%, #fb5607 0%, #f20089 50%, transparent 70%)",
    groundGlow: "radial-gradient(ellipse at 50% 0%, #fb5607 0%, #f20089 40%, transparent 70%)",
    textColor: "#00f5d4",
    accentColor: "#ffbe0b",
    btnBg: "#f20089",
    btnBorder: "#ffbe0b",
    btnGlow: "#f20089",
    btn2Border: "#00f5d4",
    btn2Text: "#00f5d4",
    logoGlow: "rgba(242,0,137,0.6)",
    navText: "#f20089",
    navHover: "#00f5d4",
  },
  light: {
    bg: "#0d0221",
    skyGradient: "linear-gradient(to bottom, #0d0221 0%, #3a0ca3 45%, #f20089 100%)",
    gridColor: "#f20089",
    sunGradient: "linear-gradient(180deg, #ffbe0b 0%, #fb5607 40%, #ff006e 100%)",
    sunGlow: "radial-gradient(ellipse at 50% 100%, #fb5607 0%, #f20089 50%, transparent 70%)",
    groundGlow: "radial-gradient(ellipse at 50% 0%, #fb5607 0%, #f20089 40%, transparent 70%)",
    textColor: "#00f5d4",
    accentColor: "#ffbe0b",
    btnBg: "#f20089",
    btnBorder: "#ffbe0b",
    btnGlow: "#f20089",
    btn2Border: "#00f5d4",
    btn2Text: "#00f5d4",
    logoGlow: "rgba(242,0,137,0.6)",
    navText: "#f20089",
    navHover: "#00f5d4",
  },
} as const;


export default function LandingPage() {
  const p = THEME_PALETTES.hacker;
  const [discordLink, setDiscordLink] = useState("https://discord.saintsgaming.net");

  useEffect(() => {
    getDiscordInviteUrl().then(setDiscordLink);
  }, []);

  return (
    <main
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden font-sans"
      style={{ backgroundColor: p.bg, color: p.textColor }}
    >
      {/* Synthwave Sunset Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Vice City Sky */}
        <div className="absolute top-0 w-full h-[60vh]" style={{ background: p.skyGradient }} />

        {/* Retro Grid Floor */}
        <div
          className="absolute bottom-0 w-full h-[40vh] origin-top opacity-60"
          style={{
            backgroundImage: `linear-gradient(transparent 65%, ${p.gridColor} 100%), repeating-linear-gradient(0deg, transparent, transparent 19px, ${p.gridColor} 20px), repeating-linear-gradient(90deg, transparent, transparent 39px, ${p.gridColor} 40px)`,
            transform: "perspective(500px) rotateX(60deg)",
          }}
        />

        {/* Sun at horizon */}
        <div
          className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full"
          style={{
            background: p.sunGradient,
            clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
          }}
        />

        {/* Sun sky glow */}
        <div
          className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-[100%] w-[40rem] h-[20rem] opacity-50"
          style={{ background: p.sunGlow }}
        />

        {/* Ground light reflection */}
        <div
          className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[80%] h-[40vh] opacity-35"
          style={{ background: p.groundGlow }}
        />
      </div>

      {/* Atmospheric digital snow / embers */}
      <DigitalSnowV5 />

      {/* Cinematic dark vignette frame */}
      <PalmCanopyVignetteV5 />

      {/* CRT Scanline Overlay */}
      <div
        className="absolute inset-0 z-40 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
          backgroundSize: "100% 4px, 3px 100%",
        }}
      />
      <div
        className="absolute inset-0 z-40 pointer-events-none bg-black/10 animate-pulse"
        style={{ animationDuration: "0.1s" }}
      />

      {/* Animated 3D Voxel Logo */}
      <div
        className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-190px] z-50 w-[450px] h-[450px]"
        style={{
          filter: `drop-shadow(0 0 2px #000) drop-shadow(0 0 2px #000) drop-shadow(0 0 2px #000) drop-shadow(0 0 30px ${p.logoGlow})`,
        }}
      >
        <SGVoxelLogo />
      </div>

      {/* Tagline */}
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center w-full mt-[-30px]">
        <motion.div
          className="text-center space-y-4 flex flex-col items-center w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p
            className="mt-2 text-xs sm:text-sm font-medium tracking-[0.25em] uppercase"
            style={{ color: p.accentColor }}
          >
            A community for gamers — EST. 2007
          </p>
        </motion.div>
      </div>

      {/* CTA Buttons */}
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center w-full mt-[80px] sm:mt-[40px]">
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href="/home"
            className="group relative px-8 py-3 sm:px-10 sm:py-4 text-white font-black italic tracking-widest uppercase text-base sm:text-lg overflow-hidden border-2 transition-shadow w-full sm:w-auto text-center"
            style={{
              backgroundColor: p.btnBg,
              borderColor: p.btnBorder,
              boxShadow: `0 0 20px ${p.btnGlow}`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative z-10 flex items-center justify-center">
              Enter
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </Link>

          <a
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group px-8 py-3 sm:px-10 sm:py-4 bg-transparent border-2 font-bold italic tracking-widest uppercase text-base sm:text-lg hover:text-[#0d0221] transition-colors w-full sm:w-auto text-center"
            style={{
              borderColor: p.btn2Border,
              color: p.btn2Text,
              boxShadow: `0 0 15px ${p.btn2Border} inset`,
            }}
          >
            Join Discord
          </a>
        </motion.div>
      </div>
    </main>
  );
}
