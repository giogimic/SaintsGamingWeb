import React from 'react';
import { useCombatStore } from '../state/useCombatStore';

export function BattleScene() {
  const activeBattle = useCombatStore((s: any) => s.activeBattle);

  return (
    <div className="w-full h-full relative bg-[#111]">
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold sg-text-gradient mb-8">
          {activeBattle?.isTrainer ? 'Trainer Battle!' : 'Wild Encounter!'}
        </h2>
        
        {/* Temporary placeholders for Phase 2 */}
        <div className="flex gap-32 mb-16">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-primary/20 border border-primary rounded-lg mb-4 flex items-center justify-center">
              {activeBattle?.playerCreature?.name}
            </div>
            <div className="w-full bg-black rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${(activeBattle?.playerCreature?.hp || 0) / (activeBattle?.playerCreature?.maxHp || 1) * 100}%` }}
              />
            </div>
            <div className="text-sm mt-1">{activeBattle?.playerCreature?.hp} / {activeBattle?.playerCreature?.maxHp}</div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-destructive/20 border border-destructive rounded-lg mb-4 flex items-center justify-center">
              {activeBattle?.wildCreature?.name}
            </div>
            <div className="w-full bg-black rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${(activeBattle?.wildCreature?.hp || 0) / (activeBattle?.wildCreature?.maxHp || 1) * 100}%` }}
              />
            </div>
            <div className="text-sm mt-1">{activeBattle?.wildCreature?.hp} / {activeBattle?.wildCreature?.maxHp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
