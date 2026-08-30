'use client';

import React from 'react';
import { Play, Maximize2, User, Smartphone, RotateCcw } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

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
  const handleLaunch = () => {
    soundSynth?.playActionSound?.();
    onEnterGame();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-[200] flex flex-col items-center justify-center p-4 overflow-y-auto select-none bg-[#050b14] font-mono">
      {/* Full-bleed atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(203,178,106,0.18) 0%, transparent 55%), linear-gradient(180deg, #0a1628 0%, #050b14 45%, #0c1220 100%)',
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
        <div className="flex items-center gap-2 text-amber-400 text-[11px] font-mono uppercase tracking-[0.25em] mb-4 font-bold">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Tactical Edition</span>
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
        <p className="text-amber-300/60 text-xs font-mono tracking-[0.2em] uppercase mb-6 font-bold">
          The Living MMO Realm
        </p>

        {character ? (
          <div
            className="w-full border border-amber-500/40 bg-black/80 backdrop-blur-md rounded-2xl p-4 mb-6 flex items-center justify-between shadow-[0_0_30px_rgba(245,158,11,0.15)]"
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-center overflow-hidden">
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
                <div className="text-amber-100 font-bold text-base truncate max-w-[150px]">
                  {character.name || 'Hero'}
                </div>
                <div className="text-amber-400/80 text-xs font-mono font-bold">
                  LVL {character.level || 1} • {character.classId || 'HERO'}
                </div>
              </div>
            </div>
            {onSelectCharacter && (
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  onSelectCharacter();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Switch
              </button>
            )}
          </div>
        ) : (
          <div className="w-full border border-amber-500/30 bg-black/60 rounded-2xl p-4 mb-6 flex items-center justify-center gap-2 text-amber-200 text-sm font-mono">
            <User className="w-4 h-4 text-amber-400" />
            <span>Ready to join the realm</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLaunch}
          className="w-full py-4 px-6 rounded-2xl font-black text-base tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-black relative overflow-hidden group border border-amber-300/60 shadow-[0_0_35px_rgba(245,158,11,0.4)] cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #d97706 100%)',
            clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Maximize2 className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Enter Fullscreen</span>
          <Play className="w-4 h-4 fill-current relative z-10" />
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-amber-400/50 text-[11px] font-mono">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Landscape orientation recommended for controls</span>
        </div>
      </div>
    </div>
  );
}

