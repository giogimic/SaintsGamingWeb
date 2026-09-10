import React, { useState } from 'react';
import { useCombatStore } from '../state/useCombatStore';
import { socketManager } from '../net/SocketManager';
import { soundSynth } from '@/engine/sound-synth';

export function BattleScene() {
  const activeBattle = useCombatStore((s: any) => s.activeBattle);
  const [menuState, setMenuState] = useState<'MAIN' | 'FIGHT' | 'BAG'>('MAIN');

  if (!activeBattle) {
    return <div className="w-full h-full bg-black text-white flex items-center justify-center">Loading Battle...</div>;
  }

  const { wildCreature: opp, playerCreature: pc, log } = activeBattle;
  const isPlayerTurn = activeBattle.phase === 'WAITING_FOR_INPUT';

  const handleAction = (actionType: string, abilityId?: string, itemId?: string) => {
    if (!isPlayerTurn) return;
    
    soundSynth?.playSelectSound?.();
    socketManager.emit('battle_action', {
      battleId: activeBattle.id,
      action: actionType,
      abilityId,
      itemId
    });
    setMenuState('MAIN');
  };

  return (
    <div className="w-full h-full relative bg-[#050b14] overflow-hidden select-none font-sans text-white">
      {/* Dynamic Background / Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-[#050b14]/90 pointer-events-none" />

      {/* Opponent Frame (Top Right) */}
      <div className="absolute top-12 right-12 md:right-32 w-80 bg-black/60 border border-border/50 rounded-xl p-4 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-bold text-lg">{opp.name}</span>
          <span className="text-xs font-mono text-muted-foreground">Lv {opp.level}</span>
        </div>
        
        {/* Tri-Color Vitality Gauge */}
        <div className="w-full bg-black/80 rounded-full h-4 border border-border/80 overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              (opp.hp / opp.maxHp) > 0.5 ? 'bg-emerald-500' : (opp.hp / opp.maxHp) > 0.2 ? 'bg-amber-400' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, (opp.hp / opp.maxHp) * 100))}%` }}
          />
        </div>
      </div>

      {/* Opponent Sprite Placeholder (Center Top) */}
      <div className="absolute top-1/4 left-1/2 md:left-2/3 -translate-x-1/2 w-48 h-48 flex items-center justify-center">
        <div className="w-full h-full animate-bounce bg-red-900/20 border-2 border-red-500/50 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
          {opp.spriteKey || opp.name}
        </div>
      </div>

      {/* Player Sprite Placeholder (Bottom Left) */}
      <div className="absolute bottom-1/3 left-1/4 md:left-1/3 w-64 h-64 flex items-center justify-end">
        <div className="w-48 h-48 bg-blue-900/20 border-2 border-blue-500/50 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
           Player Back
        </div>
      </div>

      {/* Player Frame (Bottom Right above menu) */}
      <div className="absolute bottom-48 right-12 md:right-32 w-80 bg-black/60 border border-border/50 rounded-xl p-4 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-bold text-lg text-blue-200">{pc.name}</span>
          <span className="text-xs font-mono text-muted-foreground">Lv {pc.level}</span>
        </div>
        
        {/* Tri-Color Vitality Gauge */}
        <div className="w-full bg-black/80 rounded-full h-4 border border-border/80 overflow-hidden relative mb-1">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              (pc.hp / pc.maxHp) > 0.5 ? 'bg-emerald-500' : (pc.hp / pc.maxHp) > 0.2 ? 'bg-amber-400' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, (pc.hp / pc.maxHp) * 100))}%` }}
          />
        </div>
        <div className="text-right font-mono text-xs font-bold mt-1 tracking-wider">
          {pc.hp} / {pc.maxHp}
        </div>
      </div>

      {/* Bottom UI Console */}
      <div className="absolute bottom-0 w-full h-40 bg-black/80 border-t border-border/50 backdrop-blur-xl flex">
        {/* Battle Log Box */}
        <div className="flex-1 h-full p-4 border-r border-border/50 overflow-hidden relative">
          <div className="absolute inset-4 overflow-y-auto font-mono text-sm leading-relaxed text-blue-100/90 flex flex-col justify-end pb-2">
            {log?.length > 0 ? (
               log.map((line: string, i: number) => (
                 <div key={i} className="mb-1">{line}</div>
               ))
            ) : (
               <div className="animate-pulse text-amber-200">What will {pc.name} do?</div>
            )}
          </div>
        </div>

        {/* Command Menu */}
        <div className="w-[400px] h-full p-2 grid grid-cols-2 grid-rows-2 gap-2 bg-slate-950/80">
          {menuState === 'MAIN' && (
            <>
              <button 
                disabled={!isPlayerTurn} 
                onClick={() => setMenuState('FIGHT')}
                className="bg-red-950/40 border border-red-500/30 hover:border-red-400 hover:bg-red-900/60 rounded-lg font-bold tracking-wide uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fight
              </button>
              <button 
                disabled={!isPlayerTurn} 
                onClick={() => setMenuState('BAG')}
                className="bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/60 rounded-lg font-bold tracking-wide uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bag
              </button>
              <button 
                disabled={!isPlayerTurn} 
                onClick={() => handleAction('TEAM')}
                className="bg-blue-950/40 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-900/60 rounded-lg font-bold tracking-wide uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Team
              </button>
              <button 
                disabled={!isPlayerTurn} 
                onClick={() => handleAction('FLEE')}
                className="bg-slate-800/40 border border-slate-500/30 hover:border-slate-400 hover:bg-slate-700/60 rounded-lg font-bold tracking-wide uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Flee
              </button>
            </>
          )}

          {menuState === 'FIGHT' && (
            <>
              <button onClick={() => handleAction('ABILITY', 'tackle')} className="border border-border/30 hover:border-primary bg-card/40 rounded-lg uppercase tracking-wider font-bold">Tackle</button>
              <button onClick={() => handleAction('ABILITY', 'ember')} className="border border-border/30 hover:border-primary bg-card/40 rounded-lg uppercase tracking-wider font-bold">Ember</button>
              <button onClick={() => handleAction('ABILITY', 'growl')} className="border border-border/30 hover:border-primary bg-card/40 rounded-lg uppercase tracking-wider font-bold text-sm">Growl</button>
              <button onClick={() => setMenuState('MAIN')} className="border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg uppercase tracking-wider font-bold">Back</button>
            </>
          )}

          {menuState === 'BAG' && (
            <>
              <button onClick={() => handleAction('ITEM', undefined, 'potion')} className="border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 rounded-lg uppercase tracking-wider font-bold">Potion</button>
              <button onClick={() => handleAction('ITEM', undefined, 'capture_sphere')} className="border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded-lg uppercase tracking-wider font-bold">Capture Sphere</button>
              <button onClick={() => handleAction('ITEM', undefined, 'cure')} className="border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 rounded-lg uppercase tracking-wider font-bold">Status Cure</button>
              <button onClick={() => setMenuState('MAIN')} className="border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg uppercase tracking-wider font-bold">Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
