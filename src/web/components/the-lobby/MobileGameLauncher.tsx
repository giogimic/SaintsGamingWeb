'use client';

import React from 'react';
import { Gamepad2, Play, Maximize2, Shield, Sparkles, User, Smartphone, RotateCcw } from 'lucide-react';

interface MobileGameLauncherProps {
  character?: {
    name?: string;
    level?: number;
    classId?: string;
    spriteId?: string;
  } | null;
  onEnterGame: () => void;
  onSelectCharacter?: () => void;
}

export function MobileGameLauncher({ character, onEnterGame, onSelectCharacter }: MobileGameLauncherProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-[#05000f]/95 backdrop-blur-xl overflow-y-auto select-none">
      {/* Background radial glow */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-[#140830]/90 to-[#0c041e]/95 border border-violet-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] flex flex-col items-center text-center">
        
        {/* Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-mono uppercase tracking-widest mb-6">
          <Smartphone className="w-3.5 h-3.5 text-violet-400" />
          <span>Mobile Touch Edition</span>
        </div>

        {/* Title */}
        <h1 
          className="text-3xl sm:text-4xl font-black tracking-wider mb-2"
          style={{
            fontFamily: 'serif',
            background: 'linear-gradient(180deg, #e8d5ff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.5))',
          }}
        >
          Saints Online
        </h1>
        <p className="text-violet-400/60 text-xs font-mono tracking-widest uppercase mb-6">
          Metaverse MMORPG
        </p>

        {/* Character Card Preview */}
        {character ? (
          <div className="w-full bg-violet-950/30 border border-violet-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl bg-violet-900/40 border border-violet-500/30 flex items-center justify-center overflow-hidden"
              >
                {character.spriteId && (character.spriteId.startsWith('/') || character.spriteId.startsWith('http')) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={character.spriteId} alt={character.name || 'Hero'} className="w-10 h-10 object-contain pixelated" />
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
                <div className="text-white font-bold text-base truncate max-w-[150px]">
                  {character.name || 'Hero'}
                </div>
                <div className="text-violet-400/80 text-xs font-mono">
                  LVL {character.level || 1} • {character.classId || 'HERO'}
                </div>
              </div>
            </div>

            {onSelectCharacter && (
              <button 
                onClick={onSelectCharacter}
                className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-mono transition-all"
              >
                Switch
              </button>
            )}
          </div>
        ) : (
          <div className="w-full bg-violet-950/30 border border-violet-500/20 rounded-2xl p-4 mb-6 flex items-center justify-center gap-2 text-violet-300 text-sm font-mono">
            <User className="w-4 h-4 text-violet-400" />
            <span>Ready to join realm</span>
          </div>
        )}

        {/* ENTER GAME FULLSCREEN BUTTON */}
        <button
          onClick={onEnterGame}
          className="w-full py-4 px-6 rounded-2xl font-black text-base tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-violet-400/40 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #9333ea 100%)',
          }}
        >
          {/* Shimmer line */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <Maximize2 className="w-5 h-5 text-white animate-pulse" />
          <span>ENTER GAME (FULLSCREEN)</span>
          <Play className="w-4 h-4 text-white fill-current" />
        </button>

        {/* Hints & Orientation guidance */}
        <div className="mt-6 flex items-center justify-center gap-2 text-violet-400/50 text-[11px] font-mono">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Rotate device to Landscape for best controls</span>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-violet-700/40 text-[10px] font-mono tracking-widest">
        ᚠ &nbsp; Saints Online Mobile &nbsp; ᚠ
      </p>
    </div>
  );
}
