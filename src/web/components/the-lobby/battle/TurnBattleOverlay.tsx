import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { cn } from '@/shared/lib/utils';

export function TurnBattleOverlay() {
  const activeBattle = useGameStore(state => state.activeBattle);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  const currentMapId = useGameStore(state => state.currentMapId);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the combat log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [activeBattle?.log]);

  if (!activeBattle) return null;

  const { wildCreature, playerCreature, phase, log, isTrainer, trainerName } = activeBattle;
  
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
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      
      {/* Top Half: 3D-ish Battle Scene using basic UI elements for MVP */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-8">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-emerald-900/40 pointer-events-none" />

        {/* Wild Creature (Top Right) */}
        <div className="self-end flex items-end gap-4 z-10 w-full max-w-md animate-in slide-in-from-right duration-700">
          <div className="flex-1 bg-black/60 border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md">
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
            <div className="text-right mt-1 text-xs text-white/70">
              {wildCreature.hp} / {wildCreature.maxHp}
            </div>
          </div>
          
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
          
          <div className="flex-1 bg-black/60 border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md mb-8">
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
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-white/50">HP</span>
              <div className="font-bold text-sm text-white">
                {playerCreature.hp} / {playerCreature.maxHp}
              </div>
            </div>
          </div>
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
          <button 
            disabled={phase !== 'WAITING_FOR_INPUT'}
            onClick={() => handleAction('FIGHT', 'tackle')}
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
        </div>
      </div>
    </div>
  );
}
