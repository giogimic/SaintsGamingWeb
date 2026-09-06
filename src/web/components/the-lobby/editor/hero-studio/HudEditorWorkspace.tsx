'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { BUILTIN_HUD_THEMES } from '../../hud/hud-themes';
import { BUILTIN_HUD_PRESETS } from '../../hud/default-presets';
import { LobbyHudDockLayout } from '../../hud/LobbyHudDockLayout';
import {
  Settings, Monitor, LayoutTemplate, Sparkles, Sliders, ChevronDown, ChevronRight, Save, LayoutGrid, CheckCircle2, Trees, Droplets
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { CharacterSpritePreview } from '../../CharacterSpritePreview';

export function HudEditorWorkspace() {
  const [openSections, setOpenSections] = useState({
    theme: true,
    layout: true,
    advanced: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    soundSynth?.playUiClick?.();
  };

  const hudThemeId = useGameStore(s => s.hudThemeId);
  const setHudTheme = useGameStore(s => s.setHudTheme);
  const activePreset = useGameStore(s => s.activeHudPreset);
  const setActivePreset = useGameStore(s => s.setActiveHudPreset);
  const hudConfig = useGameStore(s => s.hudConfig);
  const updateHudConfig = useGameStore(s => s.updateHudConfig);
  
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateHudConfig({ scale: parseFloat(e.target.value) });
  };
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateHudConfig({ opacity: parseFloat(e.target.value) });
  };

  return (
    <div className="flex h-full bg-[#050811] text-foreground">
      {/* ── Sidebar (Accordion) ── */}
      <div className="w-80 border-r border-[#806f47]/40 bg-[#0b1320]/80 p-3 overflow-y-auto custom-scrollbar space-y-4">
        
        <div className="p-3 rounded-xl bg-amber-950/20 border border-primary/30">
          <div className="flex items-center gap-2 text-primary font-bold mb-1">
            <LayoutTemplate className="w-4 h-4 text-amber-400" />
            <span>In-Game HUD Configuration</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Customize the HUD visuals, layout presets, scaling, and opacity. Changes immediately reflect in the preview viewport.
          </p>
        </div>

        {/* HUD Themes */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg transition-all">
          <button
            type="button"
            onClick={() => toggleSection('theme')}
            className="w-full flex items-center justify-between p-2.5 bg-black/50 text-[#cbb26a] font-bold text-left hover:bg-black/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> HUD Themes
            </span>
            {openSections.theme ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.theme && (
            <div className="p-3 space-y-2 border-t border-[#806f47]/20 bg-[#050b14]/50">
              {Object.values(BUILTIN_HUD_THEMES).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setHudTheme(theme.id)}
                  className={`w-full text-left p-2 rounded-lg border flex flex-col gap-1 transition-colors ${
                    hudThemeId === theme.id 
                      ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                      : 'bg-black/40 border-border/20 hover:border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">{theme.name}</span>
                    {hudThemeId === theme.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{theme.description}</span>
                  <div className="mt-1 flex gap-1 h-1.5 rounded-full overflow-hidden w-full opacity-80" style={{ backgroundColor: theme.palette.glassHeaderBg }}>
                    <div className="w-1/4 h-full" style={{ background: theme.palette.hpFill }} />
                    <div className="w-1/4 h-full" style={{ background: theme.palette.mpFill }} />
                    <div className="w-1/4 h-full" style={{ background: theme.palette.xpFill }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layout Presets */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg transition-all">
          <button
            type="button"
            onClick={() => toggleSection('layout')}
            className="w-full flex items-center justify-between p-2.5 bg-black/50 text-[#cbb26a] font-bold text-left hover:bg-black/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" /> Layout Presets
            </span>
            {openSections.layout ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.layout && (
            <div className="p-3 space-y-2 border-t border-[#806f47]/20 bg-[#050b14]/50">
              {BUILTIN_HUD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  className={`w-full text-left p-2 rounded-lg border flex flex-col gap-1 transition-colors ${
                    activePreset.id === preset.id 
                      ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-black/40 border-border/20 hover:border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">{preset.name}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{preset.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg transition-all">
          <button
            type="button"
            onClick={() => toggleSection('advanced')}
            className="w-full flex items-center justify-between p-2.5 bg-black/50 text-[#cbb26a] font-bold text-left hover:bg-black/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Display Scaling & Opacity
            </span>
            {openSections.advanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.advanced && (
            <div className="p-3 space-y-4 border-t border-[#806f47]/20 bg-[#050b14]/50">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">HUD Scale</span>
                  <span className="text-primary font-bold">{Math.round((hudConfig.scale || 1) * 100)}%</span>
                </div>
                <input
                  type="range" min={0.5} max={1.5} step={0.05}
                  value={hudConfig.scale || 1}
                  onChange={handleScaleChange}
                  className="w-full accent-primary h-1"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Glass Opacity</span>
                  <span className="text-primary font-bold">{Math.round((hudConfig.opacity || 1) * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={hudConfig.opacity || 1}
                  onChange={handleOpacityChange}
                  className="w-full accent-primary h-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Preview Viewport ── */}
      <div className="flex-1 bg-[#020408] relative overflow-hidden flex items-center justify-center p-6">
        {/* Deep Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128] to-[#040811] z-0" />
        
        {/* Safe Area Container representing the Screen */}
        <div className="w-[1280px] max-w-full aspect-video border-2 border-[#806f47]/30 rounded-lg relative overflow-hidden shadow-2xl bg-[#0b1b10] z-10">
          
          {/* Animated Mock Game Scene (Parallax Grid & World Elements) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {/* Perspective Grid Floor */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.4) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                transform: 'perspective(500px) rotateX(60deg) scale(2.5)',
                transformOrigin: 'bottom',
                animation: 'panGrid 10s linear infinite',
              }}
            />
            
            {/* World Props (Trees / Environment) */}
            <div className="absolute top-[30%] left-[20%] text-emerald-900/60 drop-shadow-xl transform scale-150">
              <Trees className="w-24 h-24" />
            </div>
            <div className="absolute top-[25%] right-[25%] text-emerald-900/60 drop-shadow-xl transform scale-125">
              <Trees className="w-20 h-20" />
            </div>
            <div className="absolute bottom-[20%] right-[15%] text-blue-900/40 drop-shadow-xl">
              <Droplets className="w-32 h-32" />
            </div>

            {/* Central Player Character Sprite */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-4 bg-black/40 rounded-full blur-[2px] absolute -bottom-1" />
              <CharacterSpritePreview 
                assetProfileId="hero_default" 
                size={80} 
                scale={2.5} 
                className="drop-shadow-2xl brightness-110" 
              />
            </div>
            
            {/* Lighting Overlay */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0b1b10]/40 to-[#020503]/80 mix-blend-multiply" />
          </div>

          {/* Top Banner overlay to give it a "Game" feel */}
          <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-20 flex justify-center">
            <span className="text-[10px] text-amber-500/50 uppercase font-mono tracking-widest font-bold">In-Game HUD Preview (Live Configuration)</span>
          </div>

          {/* The actual HUD Overlay */}
          <div className="absolute inset-0 z-30">
            <LobbyHudDockLayout enableStudio={true} />
          </div>
        </div>
        
        {/* CSS Animation for the grid */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes panGrid {
            0% { background-position: 0 0; }
            100% { background-position: 0 40px; }
          }
        `}} />
      </div>
    </div>
  );
}
