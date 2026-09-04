"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { SGVoxelLogo } from "@/web/components/landing/sg-logo-true-3d";
import { PixelEnvironmentalEffects } from "@/web/components/landing/pixel-environmental-effects";
import { MidnightStars } from "@/web/components/landing/midnight-stars";
import { S3Background } from "@/web/components/landing/s3-background";
import { S3Water } from "@/web/components/landing/s3-water";
import { S3Palms } from "@/web/components/landing/s3-palms";
import { ThemeSwitcher } from "@/web/components/shared/theme-switcher";
import { getDiscordInviteUrl } from "./actions/settings";

// ── Theme color palette for Style #3 (Dreamy Tropical Sunset / Light Theme) ─────
const PALETTE_S3_SUNSET = {
  bg: "#240046",
  textColor: "#ffffff",
  accentColor: "#f9c74f",
  btnBg: "rgba(247, 37, 133, 0.15)",
  btnBorder: "#f9c74f",
  btnGlow: "#f8961e",
  btn2Border: "#f72585",
  btn2Text: "#f72585",
  logoGlow: "rgba(248, 150, 30, 0.6)",
};

// ── Theme color palette for Vice ───────────────────────────────────────────────
const PALETTE_VICE = {
  bg: "#1b121c",
  textColor: "#ffffff",
  accentColor: "#ffc15e",
  btnBg: "rgba(250, 142, 91, 0.2)",
  btnBorder: "#ff007f",
  btnGlow: "#fa8e5b",
  btn2Border: "#00f5d4",
  btn2Text: "#00f5d4",
  logoGlow: "rgba(255, 0, 127, 0.6)",
};

// ── Theme color palette for Midnight Tropical (Dark Theme) ─────────────────────
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [discordLink, setDiscordLink] = useState("https://discord.saintsgaming.net");

  useEffect(() => {
    setMounted(true);
    getDiscordInviteUrl().then(setDiscordLink);
  }, []);

  const isLight = mounted && theme === "light";
  const isVice = mounted && theme === "vice";

  const p = isLight
    ? PALETTE_S3_SUNSET
    : isVice
    ? PALETTE_VICE
    : PALETTE_MIDNIGHT_TROPICAL;

  return (
    <main
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans select-none"
      style={{ backgroundColor: p.bg, color: p.textColor }}
    >
      {/* ── Floating Theme Switcher at Top Right ────────────────────── */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeSwitcher />
      </div>

      {/* ── Background Sky ────── */}
      <S3Background 
        sunClassName={
          isLight
            ? "top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2"
            : isVice
            ? "top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2"
            : "top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 grayscale brightness-200"
        } 
      />

      {/* ── Twinkling Night Sky Stars (Only for Dark mode) ─────────── */}
      {!isLight && !isVice && <MidnightStars />}

      {/* ── Water with Thin Wavelets ──────────────────────────────── */}
      <S3Water />

      {/* ── Palms (Silhouetted framing, non-interfering) ─────────── */}
      <S3Palms />

      {/* ── Pixel Environmental Effects ───────────────────────────── */}
      <PixelEnvironmentalEffects palette={isLight ? "sunset" : isVice ? "sunset" : "midnight"} />

      {/* ── Color Overlays for Midnight or Dreamy Sunset Vignette ─── */}
      {isLight ? (
        <div 
          className="absolute inset-0 pointer-events-none z-[25] opacity-70 mix-blend-multiply"
          style={{ background: "radial-gradient(circle at 50% 50%, transparent 40%, #10002b 100%)" }}
        />
      ) : isVice ? (
        <div 
          className="absolute inset-0 pointer-events-none z-[25] opacity-40 mix-blend-color"
          style={{ background: "linear-gradient(to bottom, #d946ef, #fb923c)" }}
        />
      ) : (
        <>
          <div 
            className="absolute inset-0 pointer-events-none z-[25] opacity-80 mix-blend-color"
            style={{ background: "linear-gradient(to bottom, #03045e, #0077b6)" }}
          />
          <div 
            className="absolute inset-0 pointer-events-none z-[25] opacity-50 mix-blend-multiply"
            style={{ background: "#050014" }}
          />
        </>
      )}

      {/* ── Animated 3D Voxel Logo (Interactive: spin by drag) ─────── */}
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-190px] z-40 w-[450px] h-[450px] pointer-events-auto">
        {/* Ambient background glow behind the WebGL canvas (fast GPU rendering without canvas readback) */}
        <div
          className="absolute inset-4 rounded-full pointer-events-none opacity-40 blur-2xl -z-10"
          style={{ background: `radial-gradient(circle, ${p.logoGlow} 0%, transparent 70%)` }}
        />
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
            className="mt-2 text-xs sm:text-sm font-medium tracking-[0.25em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none text-center"
            style={{ color: p.accentColor }}
          >
            Saints Gaming: Time To Play — EST. 2007<br/>
            <span className="text-[10px] tracking-widest opacity-80 mt-1 block">From TeamSpeak & SAMP to the modern era</span>
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
              boxShadow: `0 0 15px ${p.btnBorder}66, inset 0 0 10px ${p.btnBorder}44`,
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
              boxShadow: `0 0 10px ${p.btn2Border}44 inset`,
            }}
          >
            Join Discord
          </a>
        </motion.div>
      </div>
    </main>
  );
}

