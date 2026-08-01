"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Gamepad2, Plus, Trash2, Shield, Sparkles, Zap, Wrench, User, Play } from "lucide-react";
import { deleteGameCharacter } from "@/app/actions/game";
import { toast } from "sonner";

interface CharacterSelectorProps {
  characters: any[];
  onSelect: (characterId: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

const CLASS_ICONS: Record<string, any> = {
  BRAWLER: Shield, INVOKER: Sparkles, RANGER: Zap, ARTISAN: Wrench,
  CYBER: Sparkles, SURVIVOR: Shield, WARRIOR: Shield, MAGE: Sparkles,
  THIEF: Zap,
};

const CLASS_COLORS: Record<string, { glow: string; accent: string; label: string }> = {
  WARRIOR:  { glow: 'rgba(239,68,68,0.3)',   accent: '#f87171', label: '#fca5a5' },
  MAGE:     { glow: 'rgba(139,92,246,0.35)',  accent: '#a78bfa', label: '#c4b5fd' },
  THIEF:    { glow: 'rgba(16,185,129,0.3)',   accent: '#34d399', label: '#6ee7b7' },
  RANGER:   { glow: 'rgba(245,158,11,0.3)',   accent: '#fbbf24', label: '#fde68a' },
  INVOKER:  { glow: 'rgba(139,92,246,0.35)',  accent: '#a78bfa', label: '#c4b5fd' },
  ARTISAN:  { glow: 'rgba(251,146,60,0.3)',   accent: '#fb923c', label: '#fdba74' },
  BRAWLER:  { glow: 'rgba(239,68,68,0.3)',    accent: '#f87171', label: '#fca5a5' },
  SURVIVOR: { glow: 'rgba(20,184,166,0.3)',   accent: '#2dd4bf', label: '#99f6e4' },
  CYBER:    { glow: 'rgba(56,189,248,0.3)',   accent: '#38bdf8', label: '#7dd3fc' },
};

const DEFAULT_COLOR = { glow: 'rgba(139,92,246,0.25)', accent: '#a78bfa', label: '#c4b5fd' };

export function CharacterSelector({ characters, onSelect, onCreateNew, onRefresh }: CharacterSelectorProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

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
      className="fixed inset-0 w-full h-full overflow-y-auto z-[100]"
      style={{ background: 'rgba(5,0,15,0.95)', backdropFilter: 'blur(14px)' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }}
      />

      <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-12 relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-violet-500/40" />
            <Gamepad2 className="w-5 h-5 text-violet-500/50" />
            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-violet-500/40" />
          </div>
          <h1
            className="text-4xl md:text-6xl font-black tracking-wider mb-2"
            style={{
              fontFamily: 'serif',
              background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 25px rgba(139,92,246,0.5))',
            }}
          >
            Choose Hero
          </h1>
          <p className="text-violet-500/40 text-[11px] tracking-[0.4em] uppercase font-mono">
            Select your champion to enter the world
          </p>
        </div>

        {/* Character grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => {
            let state = { level: 1 };
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
                onClick={() => onSelect(char.id)}
                onMouseEnter={() => setHoveredId(char.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden group"
                style={{
                  background: isHovered
                    ? `linear-gradient(160deg, rgba(20,8,48,0.98) 0%, rgba(30,10,60,0.98) 100%)`
                    : 'linear-gradient(160deg, rgba(15,5,35,0.97) 0%, rgba(10,3,25,0.97) 100%)',
                  border: isHovered
                    ? `1px solid ${palette.accent}60`
                    : '1px solid rgba(139,92,246,0.18)',
                  boxShadow: isHovered
                    ? `0 0 30px ${palette.glow}, 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`
                    : '0 4px 20px rgba(0,0,0,0.4)',
                  transform: isHovered ? 'translateY(-3px) scale(1.01)' : 'translateY(0) scale(1)',
                }}
              >
                {/* Top accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-200"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${palette.accent}80, transparent)`,
                    opacity: isHovered ? 1 : 0.3,
                  }}
                />

                <div className="p-6">
                  {/* Sprite + level row */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
                      style={{
                        background: `rgba(255,255,255,0.04)`,
                        border: `1px solid ${palette.accent}30`,
                        boxShadow: isHovered ? `0 0 15px ${palette.glow}` : 'none',
                      }}
                    >
                      {isCustomSprite ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.spriteId} alt={char.name} className="w-12 h-12 object-contain pixelated" />
                      ) : (
                        <div
                          className="pixelated bg-no-repeat"
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

                    <div
                      className="px-3 py-1 rounded-xl text-xs font-black font-mono"
                      style={{
                        background: `${palette.accent}18`,
                        border: `1px solid ${palette.accent}35`,
                        color: palette.label,
                      }}
                    >
                      LVL {state.level || 1}
                    </div>
                  </div>

                  {/* Name & class */}
                  <h3
                    className="text-xl font-black mb-1 transition-colors duration-200 truncate"
                    style={{ color: isHovered ? palette.label : 'rgba(237,233,254,0.85)' }}
                  >
                    {char.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mb-5">
                    <Icon className="w-3 h-3" style={{ color: palette.accent }} />
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.25em] font-mono"
                      style={{ color: `${palette.accent}80` }}
                    >
                      {char.classId || 'HERO'}
                    </span>
                  </div>

                  {/* Action row */}
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: '1px solid rgba(139,92,246,0.12)' }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(char.id); }}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.04] active:scale-[0.96]"
                      style={{
                        background: isHovered
                          ? `linear-gradient(135deg, ${palette.accent}40 0%, ${palette.accent}25 100%)`
                          : 'rgba(139,92,246,0.15)',
                        border: `1px solid ${isHovered ? palette.accent + '60' : 'rgba(139,92,246,0.25)'}`,
                        color: isHovered ? palette.label : 'rgba(196,181,253,0.7)',
                        boxShadow: isHovered ? `0 0 12px ${palette.glow}` : 'none',
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      Play
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, char.id, char.name)}
                      disabled={deletingId === char.id}
                      className="p-2 rounded-xl transition-all hover:scale-[1.04]"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        color: 'rgba(252,165,165,0.4)',
                      }}
                      title="Delete Character"
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)';
                        (e.currentTarget as HTMLElement).style.color = '#fca5a5';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.15)';
                        (e.currentTarget as HTMLElement).style.color = 'rgba(252,165,165,0.4)';
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create New card */}
          <div
            onClick={onCreateNew}
            className="rounded-2xl cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 min-h-[220px] group"
            style={{
              background: 'rgba(10,3,25,0.6)',
              border: '1px dashed rgba(139,92,246,0.25)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.45)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(10,3,25,0.6)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <Plus className="w-7 h-7 text-violet-500/60 group-hover:text-violet-300 transition-colors" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-violet-400/50 group-hover:text-violet-300 uppercase tracking-[0.3em] transition-colors">
                New Hero
              </p>
              <p className="text-[10px] text-violet-600/30 font-mono mt-1">Create a character</p>
            </div>
          </div>
        </div>

        <p className="mt-10 text-violet-700/30 text-[10px] font-mono tracking-widest">
          ᚠ &nbsp; Saints Online &nbsp; ᚠ
        </p>
      </div>
    </div>
  );
}
