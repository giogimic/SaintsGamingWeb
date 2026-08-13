import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { cn } from '@/shared/lib/utils';
import { getCombatAbility } from '@/shared/game/combatAbilities';
import { GamePanelShell } from '../hud/GamePanelShell';

export function TurnBattleOverlay() {
  const activeBattle = useGameStore(state => state.activeBattle);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  const currentMapId = useGameStore(state => state.currentMapId);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [showMoves, setShowMoves] = useState(false);

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
        <GamePanelShell neonAccent="magenta" className="p-6 max-w-xl">
          <h2 className="text-xl font-bold text-[#d946ef] mb-2 font-mono drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">BATTLE STATE ERROR</h2>
          <p className="text-cyan-50 font-medium">Missing creature data in active battle.</p>
          <pre className="mt-4 text-xs bg-black/50 p-4 rounded overflow-auto max-w-2xl max-h-64 border border-[#d946ef]/30 text-magenta-200/80 font-mono shadow-inner">
            {JSON.stringify(activeBattle, null, 2)}
          </pre>
        </GamePanelShell>
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
      setShowMoves(true);
      return;
    }
    
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
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
      {/* Top Half: Creatures */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-8">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-emerald-900/40 pointer-events-none" />

        {/* Wild Creature (Top Right) */}
        <div className="self-end flex items-end gap-4 z-10 w-full max-w-md animate-in slide-in-from-right duration-700">
          <GamePanelShell neonAccent="magenta" className="flex-1 p-4">
            <div className="flex justify-between items-center mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider truncate">{foeTitle}</h3>
                {(wildCreature.isShiny || wildCreature.tags?.includes('shiny')) && (
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#cbb26a]/60 bg-[#806f47]/30 text-[#e2d5b3]">
                    shiny
                  </span>
                )}
              </div>
              <span className="text-emerald-400 font-bold shrink-0">Lv {wildCreature.level}</span>
            </div>
            
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/10">
              <div 
                className={cn("h-full transition-all duration-500", wildHpPercent > 50 ? "bg-emerald-500" : wildHpPercent > 20 ? "bg-amber-500" : "bg-red-500")} 
                style={{ width: `${wildHpPercent}%` }}
              />
            </div>
            <div className="text-right mt-1.5 text-xs text-magenta-200/80 font-mono tracking-widest font-bold">
              {wildCreature.hp} <span className="opacity-50">/ {wildCreature.maxHp}</span>
            </div>
          </GamePanelShell>
          
          <div className={cn(
            "w-48 h-48 relative flex items-center justify-center filter drop-shadow-2xl",
            (wildCreature.isShiny || wildCreature.tags?.includes('shiny')) && "ring-2 ring-[#cbb26a]/50 rounded-xl"
          )}>
            <img 
              src={
                wildCreature.spriteKey.startsWith('/')
                  ? wildCreature.spriteKey
                  : `/game-assets/${wildCreature.spriteKey}.png`
              }
              alt={wildCreature.name}
              className={cn(
                "max-w-full max-h-full object-contain pixelated",
                (wildCreature.isShiny || wildCreature.tags?.includes('shiny')) && "hue-rotate-30 saturate-150"
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/game-assets/daemon_data.png';
              }}
            />
          </div>
        </div>

        {/* Player Creature (Bottom Left) */}
        <div className="self-start flex items-end gap-4 z-10 w-full max-w-md mt-16 animate-in slide-in-from-left duration-700 delay-300">
          <div className="w-64 h-64 relative flex items-center justify-center filter drop-shadow-2xl">
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
          
          <GamePanelShell neonAccent="cyan" className="flex-1 p-4 mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">{playerCreature.name}</h3>
              <span className="text-blue-400 font-bold">Lv {playerCreature.level}</span>
            </div>
            
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/10">
              <div 
                className={cn("h-full transition-all duration-500", playerHpPercent > 50 ? "bg-emerald-500" : playerHpPercent > 20 ? "bg-amber-500" : "bg-red-500")} 
                style={{ width: `${playerHpPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-200/50">HP</span>
              <div className="font-bold text-xs text-cyan-50 font-mono tracking-widest">
                {playerCreature.hp} <span className="opacity-50">/ {playerCreature.maxHp}</span>
              </div>
            </div>
          </GamePanelShell>
        </div>
      </div>

      {/* Bottom Half: Control Panel & Combat Log */}
      <div className="h-64 bg-gray-950 border-t border-white/10 flex relative shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Left: Combat Log */}
        <div 
          ref={logContainerRef}
          className="flex-1 p-6 overflow-y-auto font-mono text-lg space-y-2 border-r border-white/10 custom-scrollbar"
        >
          {log.map((msg, idx) => (
            <div key={idx} className="text-white/90 animate-in fade-in slide-in-from-bottom-2">
              <span className="text-emerald-500 mr-2">›</span> {msg}
            </div>
          ))}
          {phase !== 'WAITING_FOR_INPUT' && (
            <div className="text-blue-400 animate-pulse mt-4">
              <span className="mr-2">›</span> Waiting for server resolution...
            </div>
          )}
        </div>

        {/* Right: Action Menu */}
        <div className="w-96 p-6 grid grid-cols-2 gap-4">
          {showMoves ? (
            <>
              {((playerCreature as any).abilities || [{ abilitySlug: 'strike' }]).slice(0, 4).map((abilityObj: any, i: number) => {
                const ability = getCombatAbility(abilityObj.abilitySlug) || getCombatAbility('strike')!;
                return (
                  <button
                    key={i}
                    disabled={phase !== 'WAITING_FOR_INPUT'}
                    onClick={() => handleAction('FIGHT', ability.id)}
                    className="sg-button-primary text-sm flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="font-bold text-lg uppercase">{ability.name}</span>
                    <span className="text-xs opacity-80 font-normal">
                      {ability.element || 'Normal'} {ability.power > 0 ? `· ${ability.power} PWR` : '· Status'}
                    </span>
                  </button>
                );
              })}
              {/* If fewer than 4 moves, fill with empty space to keep grid consistent, but we actually just want a Back button */}
              <button 
                onClick={() => setShowMoves(false)}
                className="col-span-2 mt-2 sg-button-secondary text-sm border-white/20 hover:border-white/40 hover:bg-white/5"
              >
                BACK
              </button>
            </>
          ) : (
            <>
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT'}
                onClick={() => handleAction('FIGHT')}
                className="sg-button-primary text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                FIGHT
              </button>
              
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT' || !!isTrainer}
                onClick={() => handleAction('ITEM', undefined, 'film_standard')}
                className="sg-button-secondary text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                title={isTrainer ? "Can't capture a trainer's creature" : undefined}
              >
                {isTrainer ? "NO CAPTURE" : "EXPOSE FILM"}
              </button>
              
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT'}
                onClick={() => handleAction('SWITCH')}
                className="sg-button-secondary text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                title="Switch to the next healthy party creature"
              >
                CREATURES
              </button>
              
              <button 
                disabled={phase !== 'WAITING_FOR_INPUT' || !!isTrainer}
                onClick={() => handleAction('FLEE')}
                className="sg-button-secondary text-xl text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
                title={isTrainer ? "Can't run from a trainer battle" : undefined}
              >
                {isTrainer ? "NO RUN" : "RUN"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
