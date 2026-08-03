'use client';

import React from 'react';
import { Play, User, Smartphone } from 'lucide-react';

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
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#050b14] p-6 select-none">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 18%, rgba(203,178,106,0.16) 0%, transparent 55%), linear-gradient(180deg, #0a1628 0%, #050b14 50%, #0c1220 100%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[#cbb26a]/75">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Mobile</span>
        </div>

        <h1
          className="mb-2 text-4xl font-black tracking-[0.08em] text-transparent bg-clip-text"
          style={{
            fontFamily: '"Cinzel", "Palatino Linotype", Palatino, serif',
            backgroundImage: 'linear-gradient(180deg, #f0e6c8 0%, #cbb26a 55%, #806f47 100%)',
          }}
        >
          Saints Online
        </h1>
        <p className="mb-8 max-w-[18rem] text-sm leading-relaxed text-[#cbb26a]/65">
          The full lobby HUD is built for a larger screen. Open the game for a scaled play view.
        </p>

        {character ? (
          <div className="mb-6 flex w-full items-center justify-between rounded-2xl border border-[#806f47]/40 bg-[#0c1220]/80 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#cbb26a]/30 bg-black/40">
                {character.spriteId &&
                (character.spriteId.startsWith('/') || character.spriteId.startsWith('http')) ? (
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
              <div className="min-w-0 text-left">
                <div className="truncate text-sm font-bold text-[#f0e6c8]">
                  {character.name || 'Hero'}
                </div>
                <div className="font-mono text-[11px] text-[#cbb26a]/70">
                  LVL {character.level || 1}
                </div>
              </div>
            </div>
            {onSelectCharacter && (
              <button
                type="button"
                onClick={onSelectCharacter}
                className="rounded-lg border border-[#cbb26a]/35 bg-[#cbb26a]/10 px-3 py-1.5 font-mono text-xs text-[#e8d5a3]"
              >
                Switch
              </button>
            )}
          </div>
        ) : (
          <div className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#806f47]/30 bg-[#0c1220]/60 px-4 py-3 font-mono text-sm text-[#e8d5a3]">
            <User className="h-4 w-4 text-[#cbb26a]" />
            <span>Sign in to play</span>
          </div>
        )}

        <button
          type="button"
          onClick={onEnterGame}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e8d5a3]/50 py-4 text-base font-black uppercase tracking-wider text-[#0a0a0f] shadow-[0_0_35px_rgba(203,178,106,0.35)] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #e8d5a3 0%, #cbb26a 45%, #806f47 100%)',
          }}
        >
          <Play className="h-5 w-5 fill-current" />
          Open Game
        </button>
      </div>
    </div>
  );
}
