'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  ExternalLink,
  Sparkles,
  Zap,
  Monitor,
  Cpu,
  Layers,
  Box,
  Compass,
  CheckCircle2,
  Key,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface StudioHubClientProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    permissionLevel: number;
    email: string;
  };
  siteVersion: string;
}

export function StudioHubClient({ user, siteVersion }: StudioHubClientProps) {
  const [launchAttempted, setLaunchAttempted] = useState(false);

  const handleLaunch = () => {
    setLaunchAttempted(true);
    window.location.href = 'saints-studio://open';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-card/80 to-card/40 border border-border/50 p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Standalone 3D CAD Authoring Suite</span>
            <span className="text-white/40">•</span>
            <span className="font-mono">{siteVersion}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Saints Gaming <span className="sg-text-gradient">World Studio</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            The World Studio has evolved into a dedicated desktop application for maximum performance,
            direct GPU hardware acceleration, uncapped memory, and native file management.
          </p>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleLaunch}
              className="px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition flex items-center gap-2.5 shadow-lg shadow-primary/25 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Launch Studio App</span>
            </button>

            <a
              href="/api/studio/download/latest"
              className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-border/60 hover:border-primary/40 text-white font-semibold text-sm transition flex items-center gap-2.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Download for Windows (.exe)</span>
            </a>

            <Link
              href="/auth/studio-connect"
              className="px-4 py-3.5 rounded-xl border border-border/40 hover:bg-card/40 text-xs text-muted-foreground hover:text-white transition flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5 text-primary" />
              <span>Authorize Device</span>
            </Link>
          </div>

          {launchAttempted && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 flex items-start gap-2.5 animate-fadeIn">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-semibold block">Opening Saints World Studio...</span>
                If the desktop application doesn't open within a few seconds, make sure you have downloaded and installed the latest Windows client.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-lg space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base">Direct GPU Acceleration</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bypass browser tab memory limits and sandbox throttling. Native Direct3D rendering delivers smooth 60+ FPS performance even on massive 3D worlds.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-lg space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
            <Box className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base">3D Volumetric CAD Authoring</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Industry-standard 3D marquee selection, face-normal target extrusion, volumetric brush presets, and 90° rotating blueprint stamps.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-lg space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base">World Atlas & Biome Engine</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multi-class node graph combining Authored structural maps, Simplex noise procedural regions, and Hybrid seam-stitching connectors.
          </p>
        </div>
      </div>

      {/* Two Columns: Hotkeys + Performance Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CAD Hotkeys Cheat Sheet */}
        <div className="p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span>CAD Standard Hotkeys</span>
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">Studio Controls</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Volumetric Brush</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono font-bold text-[11px] border border-border/40">B</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">3D Box Marquee</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono font-bold text-[11px] border border-border/40">M</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Extrude Face</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono font-bold text-[11px] border border-border/40">E</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Carve / Erode</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono font-bold text-[11px] border border-border/40">C</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Rotate Prefab 90°</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono font-bold text-[11px] border border-border/40">R</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Prefab Stamp Tool</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono font-bold text-[11px] border border-border/40">P</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Pan Viewport</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-border/40">Space+Drag</kbd>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050b14]/70 border border-border/30 flex items-center justify-between">
              <span className="text-muted-foreground">Brush Radius</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-border/40">Ctrl+Wheel</kbd>
            </div>
          </div>
        </div>

        {/* System Requirements & User Session */}
        <div className="p-6 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              <span>Environment & System Info</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Authorized
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-muted-foreground">
            <div className="flex justify-between py-1.5 border-b border-border/20">
              <span>Platform</span>
              <span className="text-white font-medium">Windows 10 / 11 64-bit</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/20">
              <span>Graphics</span>
              <span className="text-white font-medium">Direct3D 11/12 (DirectX 11+)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/20">
              <span>Connected Account</span>
              <span className="text-white font-medium">{user.displayName || user.username} (Lv {user.permissionLevel})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/20">
              <span>Protocol Handler</span>
              <span className="text-white font-mono text-[11px]">saints-studio://</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Installer Size</span>
              <span className="text-white font-medium">~12 MB (Portable .exe / .msi)</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/auth/studio-connect"
              className="w-full py-2 px-3 rounded-xl bg-card/60 hover:bg-card border border-border/40 text-xs flex items-center justify-center gap-2 text-slate-300 hover:text-white transition"
            >
              <span>Manage Connected Session</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
