'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { ITEM_DB, getItem } from './data/items';
import { calculatePlayerCombatStats } from './combat';

export default function EquipmentOverlay() {
  const player = useGameStore(state => state.player);
  const equipment = player.equipment;
  const setGameMode = useGameStore(state => state.setGameMode);
  const equipItem = useGameStore(state => state.equipItem);

  const stats = calculatePlayerCombatStats(player);

  const handleUnequip = (slot: 'head' | 'chest' | 'legs' | 'weapon') => {
    if (equipment[slot]) {
      useGameStore.getState().showToast(`Unequipped ${ITEM_DB[equipment[slot]]?.name || 'item'}`);
      equipItem(slot, null);
    }
  };

  const renderSlot = (slot: 'head' | 'chest' | 'legs' | 'weapon', label: string) => {
    const itemId = equipment[slot];
    const item = itemId ? ITEM_DB[itemId] : null;

    return (
      <div 
        className="relative bg-black/60 border-2 border-[#3e2723] rounded p-2 flex flex-col items-center justify-center min-h-[100px] hover:border-[#ca8a04] transition-colors cursor-pointer group shadow-inner"
        onClick={() => handleUnequip(slot)}
      >
        <span className="absolute top-1 left-1 text-[10px] text-[#8d6e63] font-mono">{label}</span>
        
        {item ? (
          <>
            <span className="text-[#4ade80] font-mono text-sm text-center font-bold mt-3">{item.name}</span>
            {item.stats?.atk && <span className="text-[10px] text-red-400 font-mono mt-1">+{item.stats.atk} ATK</span>}
            {item.stats?.def && <span className="text-[10px] text-blue-400 font-mono mt-1">+{item.stats.def} DEF</span>}
          </>
        ) : (
          <span className="text-[#5d4037] font-mono text-sm mt-3 italic">Empty</span>
        )}

        {/* Unequip Tooltip */}
        {item && (
          <div className="absolute hidden group-hover:block -top-8 bg-black border border-red-900 text-red-400 px-2 py-1 rounded text-xs z-10 pointer-events-none whitespace-nowrap">
            Click to unequip
          </div>
        )}
      </div>
    );
  };

  return (
    <RpgPanel title="EQUIPMENT" onClose={() => setGameMode('EXPLORING')}>
      
      {/* Stats Summary */}
      <div className="flex justify-around items-center bg-black/60 p-3 rounded border border-[#3e2723] mb-6">
        <div className="bg-black/60 border border-[#3e2723] rounded p-4 text-center">
          <span className="block text-xs text-slate-400 mb-1">TOTAL EFFECTIVE ATK</span>
          <span className="text-3xl font-mono text-red-500 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            {stats.atk}
          </span>
        </div>
        <div className="bg-black/60 border border-[#3e2723] rounded p-4 text-center">
          <span className="block text-xs text-slate-400 mb-1">TOTAL EFFECTIVE DEF</span>
          <span className="text-3xl font-mono text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">
            {stats.def}
          </span>
        </div>
      </div>

      {/* Equipment Slots Grid */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          {/* Head */}
          <div className="col-start-2">
            {renderSlot('head', 'HEAD')}
          </div>
          
          {/* Left Hand / Weapon */}
          <div className="col-start-1 row-start-2">
            {renderSlot('weapon', 'WEAPON')}
          </div>
          
          {/* Chest */}
          <div className="col-start-2 row-start-2">
            {renderSlot('chest', 'CHEST')}
          </div>

          {/* Right Hand / Shield (Future) */}
          <div className="col-start-3 row-start-2 opacity-50 pointer-events-none">
            <div className="relative bg-black/40 border-2 border-[#3e2723] rounded p-2 flex flex-col items-center justify-center min-h-[100px]">
              <span className="absolute top-1 left-1 text-[10px] text-[#5d4037] font-mono">OFF-HAND</span>
              <span className="text-[#3e2723] font-mono text-sm mt-3">Locked</span>
            </div>
          </div>

          {/* Legs */}
          <div className="col-start-2 row-start-3">
            {renderSlot('legs', 'LEGS')}
          </div>
        </div>
      </div>
    </RpgPanel>
  );
}
