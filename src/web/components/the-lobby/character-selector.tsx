"use client";

import { useState } from "react";
import { Gamepad2, Plus, Trash2, Shield, Sparkles, Zap, Wrench, User, Play, Swords, Heart, Coins, Award } from "lucide-react";
import { deleteGameCharacter } from "@/app/actions/game";
import { toast } from "sonner";
import { soundSynth } from "@/engine/sound-synth";

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
  CYBER: Sparkles,
  SURVIVOR: Shield,
  WARRIOR: Swords,
  MAGE: Sparkles,
  THIEF: Zap,
  RANGER: Zap,
  PRIEST: Heart,
};

const CLASS_COLORS: Record<string, { glow: string; accent: string; label: string; border: string }> = {
  WARRIOR:  { glow: 'rgba(239,68,68,0.4)',   accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.5)' },
  MAGE:     { glow: 'rgba(96,165,250,0.45)',  accent: '#60a5fa', label: '#93c5fd', border: 'rgba(96,165,250,0.5)' },
  THIEF:    { glow: 'rgba(16,185,129,0.4)',   accent: '#34d399', label: '#6ee7b7', border: 'rgba(16,185,129,0.5)' },
  RANGER:   { glow: 'rgba(251,191,36,0.4)',  accent: '#fbbf24', label: '#fde68a', border: 'rgba(251,191,36,0.5)' },
  PRIEST:   { glow: 'rgba(226,213,179,0.4)', accent: '#e2d5b3', label: '#f5f0e1', border: 'rgba(226,213,179,0.5)' },
  INVOKER:  { glow: 'rgba(139,92,246,0.45)',  accent: '#a78bfa', label: '#c4b5fd', border: 'rgba(139,92,246,0.5)' },
  ARTISAN:  { glow: 'rgba(251,146,60,0.4)',   accent: '#fb923c', label: '#fdba74', border: 'rgba(251,146,60,0.5)' },
  BRAWLER:  { glow: 'rgba(239,68,68,0.4)',    accent: '#f87171', label: '#fca5a5', border: 'rgba(239,68,68,0.5)' },
  SURVIVOR: { glow: 'rgba(20,184,166,0.4)',   accent: '#2dd4bf', label: '#99f6e4', border: 'rgba(20,184,166,0.5)' },
  CYBER:    { glow: 'rgba(56,189,248,0.4)',   accent: '#38bdf8', label: '#7dd3fc', border: 'rgba(56,189,248,0.5)' },
};

const DEFAULT_COLOR = { glow: 'rgba(34,211,238,0.3)', accent: '#22d3ee', label: '#a5f3fc', border: 'rgba(34,211,238,0.4)' };

export function CharacterSelector({ characters, onSelect, onCreateNew, onRefresh, onCancel }: CharacterSelectorProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  return (
    <div
      className="pointer-events-auto fixed inset-0 w-full h-full overflow-y-auto z-[100] flex flex-col items-center justify-center p-4 md:p-8 select-none"
      style={{
        background: 'radial-gradient(circle at center, rgba(10,18,30,0.96) 0%, rgba(4,8,15,0.98) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Cyber Grid Background Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(34,211,238,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="w-full max-w-6xl flex flex-col items-center relative z-10 py-6">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <Gamepad2 className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <div className="h-[1px] w-20 bg-gradient-to-l from-transparent via-cyan-500/50 to-transparent" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-black tracking-widest uppercase font-mono mb-2"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #22d3ee 60%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(34,211,238,0.5))',
            }}
          >
            HERO VAULT
          </h1>
          <p className="text-cyan-300/60 text-xs tracking-[0.3em] uppercase font-mono">
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
                className="relative cursor-pointer transition-all duration-200 overflow-hidden group rounded-xl p-[1px]"
                style={{
                  clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
                  background: isHovered
                    ? `linear-gradient(135deg, ${palette.accent} 0%, rgba(10,25,45,0.9) 100%)`
                    : 'linear-gradient(135deg, rgba(34,211,238,0.3) 0%, rgba(6,15,25,0.8) 100%)',
                  boxShadow: isHovered
                    ? `0 0 35px ${palette.glow}, 0 10px 30px rgba(0,0,0,0.6)`
                    : '0 4px 20px rgba(0,0,0,0.4)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                }}
              >
                <div
                  className="w-full h-full bg-[#050b14]/95 p-5 flex flex-col justify-between"
                  style={{
                    clipPath: 'polygon(11px 0%, 100% 0%, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0% 100%, 0% 11px)',
                  }}
                >
                  {/* Top Bar: Class Badge + Level */}
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" style={{ color: palette.accent }} />
                      <span className="text-[10px] font-black uppercase tracking-widest font-mono text-cyan-200/80">
                        {char.classId || 'WARRIOR'}
                      </span>
                    </div>
                    <div className="px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-extrabold shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                      LVL {state.level || 1}
                    </div>
                  </div>

                  {/* Character Avatar & Pedestal */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-black/60 border border-cyan-500/30 relative shadow-inner"
                      style={{
                        boxShadow: isHovered ? `0 0 20px ${palette.glow}` : 'inset 0 0 12px rgba(0,0,0,0.8)',
                      }}
                    >
                      {isCustomSprite ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.spriteId} alt={char.name} className="w-14 h-14 object-contain pixelated" />
                      ) : (
                        <div
                          className="pixelated bg-no-repeat transition-transform group-hover:scale-110 duration-200"
                          style={{
                            backgroundImage: `url('/game-assets/npc/${char.spriteId || 'adventurer'}.png')`,
                            backgroundPosition: '0px -64px',
                            backgroundSize: '96px 128px',
                            width: '32px',
                            height: '32px',
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black font-mono text-white truncate group-hover:text-cyan-300 transition-colors">
                        {char.name}
                      </h3>
                      <div className="flex flex-col gap-1 mt-1 text-[11px] font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3 h-3 text-rose-400" />
                          <span>HP: <strong className="text-slate-200">{state.hp || 100}/{state.maxHp || 100}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span>Pouch: <strong className="text-amber-300">{(state.credits || 1000).toLocaleString()} C</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundSynth?.playActionSound?.();
                        onSelect(char.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:shadow-[0_0_18px_rgba(34,211,238,0.4)] active:scale-95 cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      ENTER REALM
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, char.id, char.name)}
                      disabled={deletingId === char.id}
                      className="p-2 rounded-lg bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
            className="cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 min-h-[220px] rounded-xl p-[1px] group"
            style={{
              clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(139,92,246,0.1) 100%)',
            }}
          >
            <div
              className="w-full h-full bg-[#050b14]/80 p-8 flex flex-col items-center justify-center text-center group-hover:bg-[#071322]/90 transition-colors"
              style={{
                clipPath: 'polygon(11px 0%, 100% 0%, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0% 100%, 0% 11px)',
              }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-cyan-950/50 border border-cyan-500/40 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.2)] mb-3">
                <Plus className="w-7 h-7 text-cyan-400 group-hover:text-cyan-200 transition-colors" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-black text-cyan-300 uppercase tracking-widest font-mono group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                FORGE NEW HERO
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Create a new operative & customize skills</p>
            </div>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 px-6 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all active:scale-95 cursor-pointer"
          >
            Back to Studio Session
          </button>
        )}

        <p className="mt-8 text-cyan-500/40 text-[10px] font-mono tracking-widest uppercase">
          ⚔ Saints Gaming MMO Core ⚔
        </p>
      </div>
    </div>
  );
}

