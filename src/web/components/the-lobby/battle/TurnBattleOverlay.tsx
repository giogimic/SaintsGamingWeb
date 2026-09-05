'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { cn } from '@/shared/lib/utils';
import { getCombatAbility } from '@/shared/game/combatAbilities';
import { HudPanelShell } from '../hud/HudPanelShell';
import { soundSynth } from '@/engine/sound-synth';
import { Swords, Sparkles, RefreshCw, LogOut, Flame, Droplet, Leaf, Zap, Snowflake, Mountain, Shield, Target } from 'lucide-react';

const ELEMENT_ICONS: Record<string, any> = {
  fire: Flame,
  water: Droplet,
  grass: Leaf,
  electric: Zap,
  ice: Snowflake,
  ground: Mountain,
  metal: Shield,
  wood: Leaf,
};

const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fire: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5', border: 'rgba(239,68,68,0.5)' },
  water: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd', border: 'rgba(59,130,246,0.5)' },
  grass: { bg: 'rgba(34,197,94,0.2)', text: '#86efac', border: 'rgba(34,197,94,0.5)' },
  electric: { bg: 'rgba(234,179,8,0.2)', text: '#fde047', border: 'rgba(234,179,8,0.5)' },
  ice: { bg: 'rgba(56,189,248,0.2)', text: '#7dd3fc', border: 'rgba(56,189,248,0.5)' },
  ground: { bg: 'rgba(217,119,6,0.2)', text: '#fcd34d', border: 'rgba(217,119,6,0.5)' },
  wood: { bg: 'rgba(16,185,129,0.2)', text: '#6ee7b7', border: 'rgba(16,185,129,0.5)' },
  metal: { bg: 'rgba(148,163,184,0.2)', text: '#cbd5e1', border: 'rgba(148,163,184,0.5)' },
};

export function TurnBattleOverlay() {
  const activeBattle = useGameStore(state => state.activeBattle);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  const currentMapId = useGameStore(state => state.currentMapId);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [showMoves, setShowMoves] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureRollPreview, setCaptureRollPreview] = useState<{ d20: number; dc: number; total: number } | null>(null);

  const wildCreature = activeBattle?.wildCreature;
  const playerCreature = activeBattle?.playerCreature;
  const phase = activeBattle?.phase;
  const log = activeBattle?.log || [];
  const isTrainer = activeBattle?.isTrainer;
  const trainerName = activeBattle?.trainerName;

  // Auto-scroll the combat log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [activeBattle?.log]);

  // Keyboard shortcuts (1-4, Escape) for battle actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (phase !== 'WAITING_FOR_INPUT') return;

      if (e.key === 'Escape') {
        if (showMoves) {
          e.preventDefault();
          setShowMoves(false);
          soundSynth?.playSelectSound?.();
        }
        return;
      }

      if (showMoves) {
        const moveIndex = parseInt(e.key) - 1;
        const abilities = ((playerCreature as any)?.abilities || [{ abilitySlug: 'strike' }]).slice(0, 4);
        if (moveIndex >= 0 && moveIndex < abilities.length) {
          e.preventDefault();
          const ability = getCombatAbility(abilities[moveIndex].abilitySlug) || getCombatAbility('strike')!;
          handleAction('FIGHT', ability.id);
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          handleAction('FIGHT');
        } else if (e.key === '2' && !isTrainer) {
          e.preventDefault();
          handleAction('ITEM', undefined, 'film_standard');
        } else if (e.key === '3') {
          e.preventDefault();
          handleAction('SWITCH');
        } else if (e.key === '4' && !isTrainer) {
          e.preventDefault();
          handleAction('FLEE');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showMoves, isTrainer, playerCreature, activeBattle?.id, currentMapId]);

  if (!activeBattle) {
    return null;
  }
  
  if (!wildCreature || !playerCreature) {
    return (
      <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
        <HudPanelShell title="BATTLE STATE ERROR" className="p-6 max-w-xl">
          <p className="text-rose-400 font-mono text-sm">Missing creature data in active battle.</p>
          <pre className="mt-4 text-xs bg-black/50 p-4 rounded overflow-auto max-w-2xl max-h-64 border border-rose-500/30 text-rose-200/80 font-mono">
            {JSON.stringify(activeBattle, null, 2)}
          </pre>
        </HudPanelShell>
      </div>
    );
  }

  const wildHpPercent = Math.max(0, Math.min(100, (wildCreature.hp / wildCreature.maxHp) * 100));
  const playerHpPercent = Math.max(0, Math.min(100, (playerCreature.hp / playerCreature.maxHp) * 100));
  const foeTitle = isTrainer
    ? `${trainerName || "Trainer"}'s ${wildCreature.name}`
    : wildCreature.name;

  const handleAction = (
    action: string,
    moveId?: string,
    itemId?: string,
    creatureId?: string
  ) => {
    if (phase !== 'WAITING_FOR_INPUT') return;
    
    if (action === 'FIGHT' && !moveId) {
      soundSynth?.playSelectSound?.();
      setShowMoves(true);
      return;
    }
    
    if (action === 'ITEM') {
      const roll = Math.floor(Math.random() * 20) + 1;
      const dc = 12;
      const total = roll + 3;
      setCaptureRollPreview({ d20: roll, dc, total });
      setIsCapturing(true);
      setTimeout(() => {
        setIsCapturing(false);
        setCaptureRollPreview(null);
      }, 2200);
    }

    soundSynth?.playActionSound?.();
    setShowMoves(false);
    emitSocketEvent?.('battle_submit_action', {
      battleId: activeBattle.id,
      action,
      moveId,
      itemId,
      creatureId,
      mapId: currentMapId
    });
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl select-none">
      {/* Visual D20 Capture Modal */}
      {isCapturing && captureRollPreview && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0c1a2e] to-[#050b14] border-2 border-cyan-400/80 shadow-[0_0_50px_rgba(6,182,212,0.6)] flex flex-col items-center text-center font-mono max-w-sm w-full mx-4">
            <div className="text-cyan-300 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" /> Soul Capture Check
            </div>
            
            {/* D20 Dice Representation */}
            <div className="w-24 h-24 my-4 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 animate-ping" />
              <div 
                className={cn(
                  "w-20 h-20 rounded-xl border-2 flex items-center justify-center font-black text-3xl shadow-2xl transition-all",
                  captureRollPreview.d20 === 20 ? "bg-amber-500/30 border-amber-400 text-amber-300 shadow-amber-500/50" :
                  captureRollPreview.d20 === 1 ? "bg-rose-500/30 border-rose-400 text-rose-300 shadow-rose-500/50" :
                  "bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-cyan-500/50"
                )}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              >
                {captureRollPreview.d20}
              </div>
            </div>

            <div className="text-sm font-bold text-white mb-2">
              {captureRollPreview.d20 === 20 ? (
                <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">NATURAL 20! CRITICAL RESONANCE</span>
              ) : captureRollPreview.d20 === 1 ? (
                <span className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">NATURAL 1! CRITICAL FUMBLE</span>
              ) : (
                <>Rolled <span className="text-cyan-300 font-black">{captureRollPreview.d20}</span> + Modifiers</>
              )}
            </div>

            <div className="w-full bg-black/60 rounded-lg p-2.5 border border-cyan-500/20 text-xs flex justify-between text-slate-300">
              <span>Willpower DC: <strong className="text-cyan-300">{captureRollPreview.dc}</strong></span>
              <span>Total Check: <strong className="text-emerald-400">{captureRollPreview.total}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Background Ambience Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(34,211,238,0.15) 0%, transparent 70%), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />

      {/* Top Arena Surface: Combatants */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-6 md:p-10 z-10">
        
        {/* Wild Creature (Top Right) */}
        <div className="self-end flex flex-col sm:flex-row items-end gap-5 w-full max-w-md animate-in slide-in-from-right duration-500">
          <div
            className="flex-1 w-full p-4 rounded-xl shadow-2xl relative"
            style={{
              clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
              background: 'linear-gradient(135deg, rgba(225,29,72,0.2) 0%, rgba(10,15,30,0.95) 100%)',
              border: '1px solid rgba(225,29,72,0.4)',
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-base font-black text-white font-mono uppercase tracking-wider truncate">
                  {foeTitle}
                </h3>
                {(wildCreature.isShiny || wildCreature.tags?.includes('shiny')) && (
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                    SHINY
                  </span>
                )}
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 text-xs font-mono font-black border border-rose-500/40">
                LVL {wildCreature.level}
              </span>
            </div>
            
            {/* HP Gauge */}
            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500", 
                  wildHpPercent > 50 ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                  wildHpPercent > 20 ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : 
                  "bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                )} 
                style={{ width: `${wildHpPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px] font-mono font-bold text-slate-400">
              <span className="text-[9px] text-rose-400 uppercase tracking-widest">FOE VITALS</span>
              <span>
                <strong className="text-white">{wildCreature.hp}</strong> / {wildCreature.maxHp} HP
              </span>
            </div>
          </div>
          
          <div className={cn(
            "w-40 h-40 md:w-48 md:h-48 relative flex items-center justify-center filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]",
            isCapturing && "animate-bounce"
          )}>
            <img 
              src={
                wildCreature.spriteKey.startsWith('/')
                  ? wildCreature.spriteKey
                  : `/game-assets/${wildCreature.spriteKey}.png`
              }
              alt={wildCreature.name}
              className={cn(
                "max-w-full max-h-full object-contain pixelated transition-all duration-300",
                (wildCreature.isShiny || wildCreature.tags?.includes('shiny')) && "hue-rotate-30 saturate-150 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/game-assets/daemon_data.png';
              }}
            />
          </div>
        </div>

        {/* Player Creature (Bottom Left) */}
        <div className="self-start flex flex-col-reverse sm:flex-row items-end gap-5 w-full max-w-md animate-in slide-in-from-left duration-500 delay-200">
          <div className="w-48 h-48 md:w-56 md:h-56 relative flex items-center justify-center filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
            <img 
              src={
                playerCreature.spriteKey.startsWith('/')
                  ? playerCreature.spriteKey
                  : `/game-assets/${playerCreature.spriteKey}.png`
              }
              alt={playerCreature.name}
              className="max-w-full max-h-full object-contain pixelated scale-x-[-1]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/game-assets/daemon_vaccine.png';
              }}
            />
          </div>
          
          <div
            className="flex-1 w-full p-4 rounded-xl shadow-2xl relative mb-4 sm:mb-8"
            style={{
              clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(10,15,30,0.95) 100%)',
              border: '1px solid rgba(6,182,212,0.4)',
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-black text-white font-mono uppercase tracking-wider truncate">
                {playerCreature.name}
              </h3>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 text-xs font-mono font-black border border-cyan-500/40">
                LVL {playerCreature.level}
              </span>
            </div>
            
            {/* HP Gauge */}
            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500", 
                  playerHpPercent > 50 ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                  playerHpPercent > 20 ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : 
                  "bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                )} 
                style={{ width: `${playerHpPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px] font-mono font-bold text-slate-400">
              <span className="text-[9px] text-cyan-400 uppercase tracking-widest">PARTNER VITALS</span>
              <span>
                <strong className="text-white">{playerCreature.hp}</strong> / {playerCreature.maxHp} HP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Command Center & Battle Log */}
      <div 
        className="h-64 border-t border-cyan-500/30 flex flex-col md:flex-row relative shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
        style={{
          background: 'radial-gradient(circle at top, rgba(15,25,45,0.98) 0%, rgba(5,10,20,0.98) 100%)',
        }}
      >
        {/* Left: Combat Log */}
        <div 
          ref={logContainerRef}
          className="flex-1 p-5 overflow-y-auto font-mono text-sm space-y-2 border-b md:border-b-0 md:border-r border-white/10 custom-scrollbar"
        >
          {log.map((msg, idx) => (
            <div key={idx} className="text-slate-200 animate-in fade-in slide-in-from-bottom-2 flex items-start gap-2">
              <span className="text-cyan-400 font-bold">›</span>
              <span className="leading-relaxed">{msg}</span>
            </div>
          ))}
          {phase !== 'WAITING_FOR_INPUT' && (
            <div className="text-cyan-400 animate-pulse flex items-center gap-2 mt-3 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Resolving turn sequence...
            </div>
          )}
        </div>

        {/* Right: Tactical Action Menu */}
        <div className="w-full md:w-[420px] p-5 flex flex-col justify-center">
          {showMoves ? (
            <div className="grid grid-cols-2 gap-3">
              {((playerCreature as any).abilities || [{ abilitySlug: 'strike' }]).slice(0, 4).map((abilityObj: any, i: number) => {
                const ability = getCombatAbility(abilityObj.abilitySlug) || getCombatAbility('strike')!;
                const elem = (ability.element || 'metal').toLowerCase();
                const elemColor = ELEMENT_COLORS[elem] || ELEMENT_COLORS.metal;
                const ElemIcon = ELEMENT_ICONS[elem] || Swords;

                return (
                  <button
                    key={i}
                    disabled={phase !== 'WAITING_FOR_INPUT'}
                    onClick={() => handleAction('FIGHT', ability.id)}
                    className="p-3 rounded-xl flex flex-col items-start justify-between font-mono transition-all border disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 text-left cursor-pointer"
                    style={{
                      background: elemColor.bg,
                      borderColor: elemColor.border,
                    }}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-sm uppercase text-white truncate">{ability.name}</span>
                      <ElemIcon className="w-3.5 h-3.5" style={{ color: elemColor.text }} />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: elemColor.text }}>
                      {ability.power > 0 ? `${ability.power} PWR` : 'STATUS'} · [{i + 1}]
                    </span>
                  </button>
                );
              })}
              
              <button 
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setShowMoves(false);
                }}
                className="col-span-2 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all active:scale-95 cursor-pointer text-center"
              >
                ← BACK TO ACTIONS [ESC]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* FIGHT */}
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT'}
                onClick={() => handleAction('FIGHT')}
                className="p-3.5 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4 text-rose-400" />
                FIGHT [1]
              </button>
              
              {/* CAPTURE */}
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT' || !!isTrainer}
                onClick={() => handleAction('ITEM', undefined, 'film_standard')}
                className="p-3.5 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                title={isTrainer ? "Can't capture a trainer's creature" : undefined}
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {isTrainer ? "NO CAPTURE" : "BIND CRYSTAL [2]"}
              </button>
              
              {/* SWITCH */}
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT'}
                onClick={() => handleAction('SWITCH')}
                className="p-3.5 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                title="Switch to serapht healthy party creature"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                SWITCH [3]
              </button>
              
              {/* FLEE */}
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT' || !!isTrainer}
                onClick={() => handleAction('FLEE')}
                className="p-3.5 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-600/50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                title={isTrainer ? "Can't run from a trainer battle" : undefined}
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                {isTrainer ? "NO FLEE" : "FLEE [4]"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

