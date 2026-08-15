'use client';

import { useGameStore } from './store';
import { ITEM_DB } from './data/items';
import { calculatePlayerCombatStats } from './combat';
import { soundSynth } from '@/engine/sound-synth';
import { Shield, Sword, Sparkles, Zap, Crosshair, Crown, Shirt, Footprints, ShieldAlert } from 'lucide-react';

export default function EquipmentOverlay() {
  const player = useGameStore(state => state.player);
  const equipment = player.equipment;
  const equipItem = useGameStore(state => state.equipItem);
  const showToast = useGameStore(state => state.showToast);

  const stats = calculatePlayerCombatStats(player);

  const handleUnequip = (slot: 'head' | 'chest' | 'legs' | 'weapon') => {
    if (equipment[slot]) {
      soundSynth?.playSelectSound?.();
      const itemName = ITEM_DB[equipment[slot]]?.name || 'item';
      showToast(`Unequipped ${itemName}`);
      equipItem(slot, null);
    }
  };

  const renderSlot = (
    slot: 'head' | 'chest' | 'legs' | 'weapon', 
    label: string, 
    Icon: any
  ) => {
    const itemId = equipment[slot];
    const item = itemId ? ITEM_DB[itemId] : null;

    return (
      <div 
        className={`relative p-3 flex flex-col items-center justify-center min-h-[105px] transition-all duration-200 cursor-pointer group select-none ${
          item 
            ? 'border border-cyan-400/80 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
            : 'border border-slate-800 bg-black/50 hover:border-cyan-500/40 hover:bg-black/70'
        }`}
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
        }}
        onClick={() => handleUnequip(slot)}
      >
        <span className="absolute top-1.5 left-2 text-[9px] text-cyan-300 font-mono font-bold tracking-widest uppercase">
          {label}
        </span>
        
        {item ? (
          <div className="flex flex-col items-center text-center mt-3">
            <span className="text-emerald-400 font-mono text-xs font-bold leading-tight drop-shadow-sm">{item.name}</span>
            <div className="flex items-center gap-1 mt-1">
              {item.stats?.atk && (
                <span className="text-[9px] text-rose-400 font-mono font-bold bg-rose-950/60 px-1 rounded border border-rose-500/40">
                  +{item.stats.atk} ATK
                </span>
              )}
              {item.stats?.def && (
                <span className="text-[9px] text-sky-400 font-mono font-bold bg-sky-950/60 px-1 rounded border border-sky-500/40">
                  +{item.stats.def} DEF
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-cyan-500/60 transition-colors mt-2">
            <Icon className="w-6 h-6 stroke-[1.5] mb-1" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Empty</span>
          </div>
        )}

        {item && (
          <div className="absolute hidden group-hover:block -top-8 bg-black/95 border border-rose-500/50 text-rose-300 px-2.5 py-1 rounded text-[10px] font-mono z-20 pointer-events-none whitespace-nowrap shadow-lg">
            [CLICK TO UNEQUIP]
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col p-4 animate-in fade-in font-mono text-xs select-none">
      
      {/* Total Combat Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div className="bg-black/60 border border-rose-500/40 rounded-xl p-3 text-center shadow-[0_0_10px_rgba(244,63,94,0.15)]">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">ATTACK POWER</span>
          <span className="text-2xl font-black text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {stats.atk}
          </span>
        </div>
        <div className="bg-black/60 border border-sky-500/40 rounded-xl p-3 text-center shadow-[0_0_10px_rgba(56,189,248,0.15)]">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">DEFENSE RATING</span>
          <span className="text-2xl font-black text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
            {stats.def}
          </span>
        </div>
        <div className="bg-black/60 border border-amber-500/40 rounded-xl p-3 text-center shadow-[0_0_10px_rgba(245,158,11,0.15)]">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">CRIT CHANCE</span>
          <span className="text-2xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
            12%
          </span>
        </div>
        <div className="bg-black/60 border border-emerald-500/40 rounded-xl p-3 text-center shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">SPEED TIER</span>
          <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
            NORMAL
          </span>
        </div>
      </div>

      {/* Equipment Paperdoll Layout */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          {/* Head */}
          <div className="col-start-2">
            {renderSlot('head', 'HELMET', Crown)}
          </div>
          
          {/* Main Hand / Weapon */}
          <div className="col-start-1 row-start-2">
            {renderSlot('weapon', 'WEAPON', Sword)}
          </div>
          
          {/* Chest */}
          <div className="col-start-2 row-start-2">
            {renderSlot('chest', 'ARMOR', Shirt)}
          </div>

          {/* Off-Hand Shield */}
          <div className="col-start-3 row-start-2 opacity-50">
            <div 
              className="relative p-3 flex flex-col items-center justify-center min-h-[105px] border border-slate-800 bg-black/30"
              style={{
                clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
              }}
            >
              <span className="absolute top-1.5 left-2 text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">
                OFF-HAND
              </span>
              <Shield className="w-6 h-6 stroke-[1.5] text-slate-700 mb-1" />
              <span className="text-[9px] text-slate-600 font-mono uppercase">2-Handed</span>
            </div>
          </div>

          {/* Legs */}
          <div className="col-start-2 row-start-3">
            {renderSlot('legs', 'GREAVES', Footprints)}
          </div>
        </div>
      </div>

    </div>
  );
}

