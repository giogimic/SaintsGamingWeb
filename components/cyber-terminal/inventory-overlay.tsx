'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';

// Mock database of item info. Eventually move to data/items.ts
const ITEM_DB: Record<string, { name: string, description: string, type: string, spriteKey: string }> = {
  'wood_logs': { name: 'Wood Logs', description: 'Basic logs chopped from a tree.', type: 'MATERIAL', spriteKey: 'wood' },
  'copper_ore': { name: 'Copper Ore', description: 'Raw copper ore.', type: 'MATERIAL', spriteKey: 'ore_copper' },
  'raw_fish': { name: 'Raw Fish', description: 'Needs to be cooked.', type: 'FOOD', spriteKey: 'fish_raw' },
};

export default function InventoryOverlay() {
  const inventory = useGameStore(state => state.player.inventory);
  const setGameMode = useGameStore(state => state.setGameMode);
  const credits = useGameStore(state => state.player.credits);

  return (
    <RpgPanel title="INVENTORY" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex justify-between items-center bg-black/60 p-2 rounded border border-[#3e2723] mb-4">
        <span className="text-[#e0e0e0] font-bold font-mono">CREDITS</span>
        <span className="text-yellow-400 font-bold font-mono text-lg">{credits.toLocaleString()} C</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {Object.keys(inventory).length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-mono italic">
            Your inventory is empty.
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {Object.entries(inventory).map(([itemId, quantity]) => {
              if (quantity <= 0) return null;
              const itemInfo = ITEM_DB[itemId] || { name: itemId, description: 'Unknown item', type: 'UNKNOWN', spriteKey: 'unknown' };
              
              return (
                <div key={itemId} className="relative aspect-square bg-[#1a1a1a] border-2 border-[#3e2723] rounded hover:border-[#ca8a04] transition-colors cursor-pointer group flex items-center justify-center shadow-inner">
                  {/* Item Icon Placeholder */}
                  <span className="text-[#a1887f] font-mono text-xs text-center p-1 break-all">{itemInfo.name}</span>
                  
                  {/* Quantity Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-black border border-[#3e2723] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    {quantity}
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 border border-[#ca8a04] p-2 rounded z-50 text-xs shadow-lg pointer-events-none">
                    <p className="text-white font-bold mb-1">{itemInfo.name}</p>
                    <p className="text-slate-300 italic">{itemInfo.description}</p>
                    <p className="text-yellow-500 mt-1 uppercase text-[10px]">{itemInfo.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4e342e; border-radius: 4px; border: 1px solid #3e2723; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5d4037; }
      `}} />
    </RpgPanel>
  );
}
