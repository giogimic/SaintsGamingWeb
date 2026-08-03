'use client';

import React from 'react';
import { Play, Maximize2, User, Smartphone, RotateCcw } from 'lucide-react';

interface MobileGameLauncherProps {
  character?: {
    name?: string;
    level?: number;
    classId?: string;
    spriteId?: string;
  } | null;
  /** Opens the scaled in-game lobby (no site chrome). */
  onEnterGame: () => void;
  onSelectCharacter?: () => void;
}

/**
 * Narrow-viewport gate: do not mount the game window — only a single Open Game CTA.
 * Keeps phones out of the desktop HUD until the player explicitly enters.
 */
export function MobileGameLauncher({
  character,
  onEnterGame,
  onSelectCharacter,
}: MobileGameLauncherProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 overflow-y-auto select-none bg-[#050b14]">
      {/* Full-bleed atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(203,178,106,0.14) 0%, transparent 55%), linear-gradient(180deg, #0a1628 0%, #050b14 45%, #0c1220 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(203,178,106,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(203,178,106,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#cbb26a]/70 to-transparent" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center px-2">
        <div className="flex items-center gap-2 text-[#cbb26a]/80 text-[11px] font-mono uppercase tracking-[0.25em] mb-5">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Touch Edition</span>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black tracking-[0.08em] mb-2 text-transparent bg-clip-text"
          style={{
            fontFamily: '"Cinzel", "Palatino Linotype", Palatino, serif',
            backgroundImage: 'linear-gradient(180deg, #f0e6c8 0%, #cbb26a 55%, #806f47 100%)',
            filter: 'drop-shadow(0 0 28px rgba(203,178,106,0.35))',
          }}
        >
          Saints Online
        </h1>
        <p className="text-[#cbb26a]/55 text-xs font-mono tracking-[0.2em] uppercase mb-8">
          Enter the living world
        </p>

        {character ? (
          <div className="w-full border border-[#806f47]/40 bg-[#0c1220]/70 backdrop-blur-md rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black/40 border border-[#cbb26a]/30 flex items-center justify-center overflow-hidden">
                {character.spriteId && (character.spriteId.startsWith('/') || character.spriteId.startsWith('http')) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.spriteId}
                    alt=""
                    className="h-9 w-9 object-contain pixelated"
                  />
                ) : (
                  <div
                    className="pixelated bg-no-repeat"
                    style={{
                      backgroundImage: `url('/game-assets/npc/${character.spriteId || 'adventurer'}.png')`,
                      backgroundPosition: '0px -64px',
                      backgroundSize: '96px 128px',
                      width: '32px',
                      height: '32px',
                    }}
                  />
                )}
              </div>
              <div className="text-left">
                <div className="text-[#f0e6c8] font-bold text-base truncate max-w-[150px]">
                  {character.name || 'Hero'}
                </div>
                <div className="text-[#cbb26a]/70 text-xs font-mono">
                  LVL {character.level || 1} • {character.classId || 'HERO'}
                </div>
              </div>
            </div>
            {onSelectCharacter && (
              <button
                onClick={onSelectCharacter}
                className="px-3 py-1.5 rounded-lg bg-[#cbb26a]/10 hover:bg-[#cbb26a]/20 border border-[#cbb26a]/35 text-[#e8d5a3] text-xs font-mono transition-all"
              >
                Switch
              </button>
            )}
          </div>
        ) : (
          <div className="w-full border border-[#806f47]/30 bg-[#0c1220]/60 rounded-2xl p-4 mb-6 flex items-center justify-center gap-2 text-[#e8d5a3] text-sm font-mono">
            <User className="w-4 h-4 text-[#cbb26a]" />
            <span>Ready to join the realm</span>
          </div>
        )}

        <button
          type="button"
          onClick={onEnterGame}
          className="w-full py-4 px-6 rounded-2xl font-black text-base tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-[#0a0a0f] relative overflow-hidden group border border-[#e8d5a3]/50 shadow-[0_0_35px_rgba(203,178,106,0.35)]"
          style={{
            background: 'linear-gradient(135deg, #e8d5a3 0%, #cbb26a 45%, #806f47 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Maximize2 className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Enter Fullscreen</span>
          <Play className="w-4 h-4 fill-current relative z-10" />
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-[#cbb26a]/45 text-[11px] font-mono">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Landscape recommended for controls</span>
        </div>
      </div>
    </div>
  );
}
