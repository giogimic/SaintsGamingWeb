"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { SGVoxelLogo } from "@/web/components/landing/sg-logo-true-3d";
import { PixelEnvironmentalEffects } from "@/web/components/landing/pixel-environmental-effects";
import { MidnightStars } from "@/web/components/landing/midnight-stars";
import { S3Background } from "@/web/components/landing/s3-background";
import { S3Water } from "@/web/components/landing/s3-water";
import { S3Palms } from "@/web/components/landing/s3-palms";
import { getDiscordInviteUrl } from "./actions/settings";

// ── Theme color palette for Midnight Tropical ─────────────────────
const PALETTE_MIDNIGHT_TROPICAL = {
  bg: "#050014",
  textColor: "#ffffff",
  accentColor: "#00f5d4",
  btnBg: "rgba(114, 9, 183, 0.2)",
  btnBorder: "#00f5d4",
  btnGlow: "#7209b7",
  btn2Border: "#4cc9f0",
  btn2Text: "#4cc9f0",
  logoGlow: "rgba(0, 245, 212, 0.6)",
};

export default function LandingPage() {
  const p = PALETTE_MIDNIGHT_TROPICAL;
  const [discordLink, setDiscordLink] = useState("https://discord.saintsgaming.net");

  useEffect(() => {
    getDiscordInviteUrl().then(setDiscordLink);
  }, []);

  return (
    <main
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans select-none"
      style={{ backgroundColor: p.bg, color: p.textColor }}
    >
      {/* ── Background Sky ────── */}
      <S3Background sunClassName="top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 grayscale brightness-200" />

      {/* ── Twinkling Night Sky Stars & Shooting Star ─────────────── */}
      <MidnightStars />

      {/* ── Water with Thin Wavelets ──────────────────────────────── */}
      <S3Water />

      {/* ── Palms (Silhouetted framing, non-interfering) ─────────── */}
      <S3Palms />

      {/* ── Midnight Pixel Environmental Effects ───────────────────── */}
      <PixelEnvironmentalEffects palette="midnight" />

      {/* ── Midnight Color Overlays ────────────────────────────────── */}
      <div 
        className="absolute inset-0 pointer-events-none z-[25] opacity-80 mix-blend-color"
        style={{ background: "linear-gradient(to bottom, #03045e, #0077b6)" }}
      />
      
      <div 
        className="absolute inset-0 pointer-events-none z-[25] opacity-50 mix-blend-multiply"
        style={{ background: "#050014" }}
      />

      {/* ── Animated 3D Voxel Logo (Interactive: spin by drag) ─────── */}
      <div
        className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-190px] z-40 w-[450px] h-[450px] pointer-events-auto"
        style={{
          filter: `drop-shadow(0 0 2px #000) drop-shadow(0 0 5px #000) drop-shadow(0 0 30px ${p.logoGlow})`,
        }}
      >
        <SGVoxelLogo />
      </div>

      {/* ── Tagline (Pass-through pointer events) ─────────────────── */}
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center w-full mt-[-30px] pointer-events-none select-none">
        <motion.div
          className="text-center space-y-4 flex flex-col items-center w-full pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p
            className="mt-2 text-xs sm:text-sm font-medium tracking-[0.25em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none"
            style={{ color: p.accentColor }}
          >
            A community for gamers — EST. 2007
          </p>
        </motion.div>
      </div>

      {/* ── CTA Buttons (Interactive buttons only) ────────────────── */}
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center w-full mt-[80px] sm:mt-[40px] pointer-events-none">
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full justify-center px-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href="/home"
            className="group relative px-8 py-3 sm:px-10 sm:py-4 text-white font-black italic tracking-widest uppercase text-base sm:text-lg overflow-hidden border-2 transition-shadow w-full sm:w-auto text-center pointer-events-auto cursor-pointer"
            style={{
              backgroundColor: p.btnBg,
              borderColor: p.btnBorder,
              boxShadow: `0 0 15px rgba(0,245,212,0.3), inset 0 0 10px rgba(0,245,212,0.2)`,
              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <span className="relative z-10 flex items-center justify-center pointer-events-none">
              Enter
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </Link>

          <a
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group px-8 py-3 sm:px-10 sm:py-4 bg-transparent border-2 font-bold italic tracking-widest uppercase text-base sm:text-lg hover:text-[#fff] hover:border-white transition-colors w-full sm:w-auto text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-auto cursor-pointer"
            style={{
              borderColor: p.btn2Border,
              color: p.btn2Text,
              boxShadow: `0 0 10px rgba(76,201,240,0.3) inset`,
            }}
          >
            Join Discord
          </a>
        </motion.div>
      </div>
    </main>
  );
}

