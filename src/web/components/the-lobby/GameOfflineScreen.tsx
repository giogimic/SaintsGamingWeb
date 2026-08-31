'use client';

import React, { useState } from 'react';
import { WifiOff, RefreshCw, ShieldAlert, Sparkles, LogIn, ArrowLeft, ExternalLink } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { useTheme } from 'next-themes';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';
import Link from 'next/link';

interface GameOfflineScreenProps {
  onAdminLogin?: () => void;
  onRefresh?: () => Promise<void> | void;
  discordUrl?: string;
  customMessage?: string;
  isAdmin?: boolean;
}

export function GameOfflineScreen({
  onAdminLogin,
  onRefresh,
  discordUrl = 'https://discord.saintsgaming.net',
  customMessage,
  isAdmin,
}: GameOfflineScreenProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isVice = theme === 'vice' || theme === 'hacker';
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    soundSynth?.playSelectSound?.();
    setChecking(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const res = await fetch('/api/setup/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.status?.isSetupCompleted) {
            window.location.reload();
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  const handleAdminAuth = () => {
    soundSynth?.playActionSound?.();
    if (onAdminLogin) {
      onAdminLogin();
    } else {
      window.location.href = '/login?callbackUrl=/lobby';
    }
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 w-full h-full overflow-y-auto z-20 flex flex-col items-center justify-center p-4 md:p-8 pt-16 pb-14 sm:pt-14 sm:pb-10 select-none font-sans"
      style={{ backgroundColor: isLight ? '#240046' : isVice ? '#1b121c' : '#050014' }}
    >
      {/* Dynamic Horizon Background */}
      <MidnightTropicalBackground />

      {/* CRT Scanline effect */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.06))',
          backgroundSize: '100% 4px, 3px 100%',
        }}
      />

      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition-all bg-black/80 border border-pink-500/40 text-pink-300 hover:text-white hover:border-[#00f5d4] hover:bg-pink-950/40 cursor-pointer shadow-lg active:scale-95"
      >
        <ArrowLeft size={14} strokeWidth={2.5} />
        Return to Portal
      </Link>

      <div className="w-full max-w-xl flex flex-col items-center relative z-20 text-center py-6">
        {/* Glowing Shield Icon */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 bg-pink-500/30 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-[#0a0318]/90 border-2 border-pink-500/60 flex items-center justify-center shadow-[0_0_35px_rgba(242,0,137,0.5)]">
            <WifiOff className="w-12 h-12 text-[#00f5d4] drop-shadow-[0_0_12px_rgba(0,245,212,0.8)]" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-950/80 border border-pink-500/50 text-pink-300 text-xs font-mono font-black uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(242,0,137,0.3)]">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          REALM STATUS: CURRENTLY OFFLINE
        </div>

        {/* Main Heading */}
        <h1
          className="text-4xl md:text-5xl font-black tracking-widest uppercase font-mono mb-4"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 25px rgba(242,0,137,0.6))',
          }}
        >
          MAINTENANCE MODE
        </h1>

        {/* Message */}
        <p className="text-cyan-200/80 text-sm md:text-base font-mono max-w-lg mb-8 leading-relaxed">
          {customMessage ||
            'The Saints MMO World is currently awaiting initialization and genesis setup. World servers are temporarily offline to public players.'}
        </p>

        {/* Actions Deck */}
        <div
          className="w-full bg-[#0a0318]/90 border border-pink-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4 relative overflow-hidden"
          style={{
            clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Refresh Status Button */}
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/60 text-[#00f5d4] shadow-[0_0_15px_rgba(0,245,212,0.25)] active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Checking Realm...' : 'Check Status'}
            </button>

            {/* Discord Link Button */}
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/60 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)] active:scale-95 cursor-pointer"
            >
              <ExternalLink size={15} />
              Community Discord
            </a>
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-pink-500/30 to-transparent my-1" />

          {/* Admin / Staff Login Portal */}
          <div className="flex flex-col items-center">
            {isAdmin ? (
              <>
                <p className="text-[11px] font-mono text-slate-400 mb-3">
                  World Developer Account Detected
                </p>
                <Link
                  href="/setup"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-mono font-extrabold text-xs uppercase tracking-widest transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} />
                  Proceed to Realm Setup
                </Link>
              </>
            ) : (
              <>
                <p className="text-[11px] font-mono text-slate-400 mb-3">
                  Server Administrator or World Developer?
                </p>
                <button
                  onClick={handleAdminAuth}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-mono font-extrabold text-xs uppercase tracking-widest transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn size={15} />
                  Staff / Admin Sign In
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-8 text-pink-500/40 text-[10px] font-mono tracking-widest uppercase">
          ✦ Saints Gaming MMO Core Engine // Genesis Gate ✦
        </p>
      </div>
    </div>
  );
}
