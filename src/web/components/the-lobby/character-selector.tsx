"use client";

import { useState } from "react";
import { Gamepad2, Plus, Trash2, Shield, Sparkles, Zap, Wrench, User, Play, Swords, Heart, Coins, ArrowLeft } from "lucide-react";
import { deleteGameCharacter } from "@/app/actions/game";
import { toast } from "sonner";
import { soundSynth } from "@/engine/sound-synth";
import { useGameStore } from "./store";
import { DigitalSnowV5 } from "@/web/components/landing/digital-snow-v5";
import { PalmCanopyVignetteV5 } from "@/web/components/landing/palm-canopy-vignette-v5";

interface CharacterSelectorProps {
  characters: any[];
  onSelect: (characterId: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
  /** Studio author session — return without picking a character. */
  onCancel?: () => void;
}

const CLASS_ICONS: Record<string, any> = {
  BRAWLER: Shield,
  INVOKER: Sparkles,
  ARTISAN: Wrench,
  CYBER: Zap,
  SURVIVOR: Shield,
  WARRIOR: Swords,
  MAGE: Sparkles,
  THIEF: Zap,
  RANGER: Zap,
  PRIEST: Heart,
};

const CLASS_COLORS: Record<string, { glow: string; accent: string; label: string; border: string }> = {
  WARRIOR:  { glow: 'rgba(239,68,68,0.45)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.6)' },
  MAGE:     { glow: 'rgba(96,165,250,0.5)',   accent: '#60a5fa', label: '#93c5fd', border: 'rgba(96,165,250,0.6)' },
  THIEF:    { glow: 'rgba(16,185,129,0.45)',  accent: '#34d399', label: '#6ee7b7', border: 'rgba(16,185,129,0.6)' },
  RANGER:   { glow: 'rgba(251,191,36,0.45)',  accent: '#fbbf24', label: '#fde68a', border: 'rgba(251,191,36,0.6)' },
  PRIEST:   { glow: 'rgba(226,213,179,0.45)', accent: '#e2d5b3', label: '#f5f0e1', border: 'rgba(226,213,179,0.6)' },
  INVOKER:  { glow: 'rgba(139,92,246,0.5)',   accent: '#a78bfa', label: '#c4b5fd', border: 'rgba(139,92,246,0.6)' },
  ARTISAN:  { glow: 'rgba(251,146,60,0.45)',  accent: '#fb923c', label: '#fdba74', border: 'rgba(251,146,60,0.6)' },
  BRAWLER:  { glow: 'rgba(239,68,68,0.45)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.6)' },
  SURVIVOR: { glow: 'rgba(20,184,166,0.45)',  accent: '#2dd4bf', label: '#99f6e4', border: 'rgba(20,184,166,0.6)' },
  CYBER:    { glow: 'rgba(0,245,212,0.45)',   accent: '#00f5d4', label: '#a5f3fc', border: 'rgba(0,245,212,0.6)' },
};

const DEFAULT_COLOR = { glow: 'rgba(242,0,137,0.35)', accent: '#f20089', label: '#f472b6', border: 'rgba(242,0,137,0.5)' };

export function CharacterSelector({ characters, onSelect, onCreateNew, onRefresh, onCancel }: CharacterSelectorProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const setGameMode = useGameStore((state) => state.setGameMode);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete hero "${name}"? All inventory and quest progress will be lost.`)) return;

    setDeletingId(id);
    const res = await deleteGameCharacter(id);
    if (res.success) {
      toast.success(`${name} was deleted.`);
      onRefresh();
    } else {
      toast.error(res.error || "Failed to delete character.");
    }
    setDeletingId(null);
  };

  const handleBack = () => {
    soundSynth?.playSelectSound?.();
    if (onCancel) {
      onCancel();
    } else {
      setGameMode('TITLE_SCREEN');
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 w-full h-full overflow-y-auto z-[100] flex flex-col items-center justify-center p-4 md:p-8 select-none font-sans"
      style={{
        backgroundColor: '#0d0221',
      }}
    >
      {/* Synthwave Horizon Grid Floor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 w-full h-[60vh]"
          style={{ background: 'linear-gradient(to bottom, #0d0221 0%, #3a0ca3 45%, #f20089 100%)', opacity: 0.8 }}
        />
        <div
          className="absolute bottom-0 w-full h-[40vh] origin-top opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(transparent 65%, #f20089 100%), repeating-linear-gradient(0deg, transparent, transparent 19px, #f20089 20px), repeating-linear-gradient(90deg, transparent, transparent 39px, #f20089 40px)',
            transform: 'perspective(500px) rotateX(60deg)',
          }}
        />
      </div>

      <DigitalSnowV5 />
      <PalmCanopyVignetteV5 />

      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition-all bg-black/80 border border-pink-500/40 text-pink-300 hover:text-white hover:border-[#00f5d4] hover:bg-pink-950/40 cursor-pointer shadow-lg active:scale-95"
      >
        <ArrowLeft size={14} strokeWidth={2.5} />
        Back to Gateway
      </button>

      <div className="w-full max-w-6xl flex flex-col items-center relative z-20 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent" />
            <Gamepad2 className="w-5 h-5 text-[#00f5d4] drop-shadow-[0_0_8px_rgba(0,245,212,0.8)]" />
            <div className="h-[1px] w-20 bg-gradient-to-l from-transparent via-[#00f5d4] to-transparent" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-black tracking-widest uppercase font-mono mb-2"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #ffbe0b 50%, #f20089 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(242,0,137,0.6))',
            }}
          >
            HERO VAULT
          </h1>
          <p className="text-cyan-300/70 text-xs tracking-[0.3em] uppercase font-mono">
            Select your champion operative to enter the live world
          </p>
        </div>

        {/* Character grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {characters.map((char) => {
            let state: any = { level: 1, hp: 100, maxHp: 100, credits: 1000, perk: 'SWIFT_TRAVELER' };
            try {
              if (char.stateData) state = JSON.parse(char.stateData);
            } catch {}

            const classKey = (char.classId || 'WARRIOR').toUpperCase();
            const Icon = CLASS_ICONS[classKey] || User;
            const palette = CLASS_COLORS[classKey] || DEFAULT_COLOR;
            const isCustomSprite = char.spriteId && (char.spriteId.startsWith('/') || char.spriteId.startsWith('http'));
            const isHovered = hoveredId === char.id;

            return (
              <div
                key={char.id}
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  onSelect(char.id);
                }}
                onMouseEnter={() => {
                  soundSynth?.playSelectSound?.();
                  setHoveredId(char.id);
                }}
                onMouseLeave={() => setHoveredId(null)}
                className="relative cursor-pointer transition-all duration-200 overflow-hidden group rounded-2xl p-[1px]"
                style={{
                  clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
                  background: isHovered
                    ? `linear-gradient(135deg, ${palette.accent} 0%, rgba(242,0,137,0.6) 100%)`
                    : 'linear-gradient(135deg, rgba(242,0,137,0.4) 0%, rgba(13,2,33,0.9) 100%)',
                  boxShadow: isHovered
                    ? `0 0 35px ${palette.glow}, 0 10px 30px rgba(0,0,0,0.7)`
                    : '0 4px 20px rgba(0,0,0,0.5)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                }}
              >
                <div
                  className="w-full h-full bg-[#0a0318]/95 p-5 flex flex-col justify-between"
                  style={{
                    clipPath: 'polygon(13px 0%, 100% 0%, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0% 100%, 0% 13px)',
                  }}
                >
                  {/* Top Bar: Class Badge + Level */}
                  <div className="flex items-center justify-between mb-4 border-b border-pink-500/20 pb-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" style={{ color: palette.accent }} />
                      <span className="text-[10px] font-black uppercase tracking-widest font-mono text-cyan-200">
                        {char.classId || 'WARRIOR'}
                      </span>
                    </div>
                    <div className="px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-[#00f5d4] text-xs font-mono font-extrabold shadow-[0_0_8px_rgba(0,245,212,0.3)]">
                      LVL {state.level || 1}
                    </div>
                  </div>

                  {/* Character Avatar & Pedestal */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-black/70 border border-pink-500/30 relative shadow-inner"
                      style={{
                        boxShadow: isHovered ? `0 0 20px ${palette.glow}` : 'inset 0 0 12px rgba(0,0,0,0.8)',
                      }}
                    >
                      {isCustomSprite ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.spriteId} alt={char.name} className="w-14 h-14 object-contain pixelated drop-shadow-[0_0_8px_rgba(0,245,212,0.5)]" />
                      ) : (
                        <div
                          className="pixelated bg-no-repeat transition-transform group-hover:scale-110 duration-200 drop-shadow-[0_0_10px_rgba(242,0,137,0.6)]"
                          style={{
                            backgroundImage: `url('/game-assets/npc/${char.spriteId || 'adventurer'}.png')`,
                            backgroundPosition: '0px -64px',
                            backgroundSize: '96px 128px',
                            width: '32px',
                            height: '32px',
                            transform: 'scale(1.8)',
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black font-mono text-white truncate group-hover:text-[#00f5d4] transition-colors">
                        {char.name}
                      </h3>
                      <div className="flex flex-col gap-1 mt-1 text-[11px] font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3 h-3 text-rose-400" />
                          <span>HP: <strong className="text-white">{state.hp || 100}/{state.maxHp || 100}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span>Pouch: <strong className="text-amber-300">{(state.credits || 1000).toLocaleString()} C</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-3 border-t border-pink-500/20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundSynth?.playActionSound?.();
                        onSelect(char.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white shadow-[0_0_15px_rgba(242,0,137,0.4)] active:scale-95 cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      ENTER REALM
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, char.id, char.name)}
                      disabled={deletingId === char.id}
                      className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Delete Champion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create New Card */}
          <div
            onClick={() => {
              soundSynth?.playActionSound?.();
              onCreateNew();
            }}
            className="cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 min-h-[220px] rounded-2xl p-[1px] group"
            style={{
              clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
              background: 'linear-gradient(135deg, rgba(0,245,212,0.4) 0%, rgba(242,0,137,0.3) 100%)',
            }}
          >
            <div
              className="w-full h-full bg-[#0a0318]/85 p-8 flex flex-col items-center justify-center text-center group-hover:bg-[#12052a]/90 transition-colors"
              style={{
                clipPath: 'polygon(13px 0%, 100% 0%, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0% 100%, 0% 13px)',
              }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-pink-950/60 border border-pink-500/50 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(242,0,137,0.3)] mb-3">
                <Plus className="w-7 h-7 text-[#00f5d4] group-hover:text-white transition-colors" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffbe0b] to-[#00f5d4] uppercase tracking-widest font-mono">
                FORGE NEW HERO
              </p>
              <p className="text-[10px] text-slate-300 font-mono mt-1">Create a new operative & customize skills</p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-pink-500/50 text-[10px] font-mono tracking-widest uppercase">
          ⚔ Saints Gaming MMO Core Engine ⚔
        </p>
      </div>
    </div>
  );
}
