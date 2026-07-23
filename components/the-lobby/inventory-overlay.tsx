'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { ITEM_DB } from './data/items';

export default function InventoryOverlay() {
  const inventory = useGameStore(state => state.player.inventory);
  const equipment = useGameStore(state => state.player.equipment);
  const setGameMode = useGameStore(state => state.setGameMode);
  const credits = useGameStore(state => state.player.credits);
  const equipItem = useGameStore(state => state.equipItem);

  const handleItemClick = (itemId: string, itemInfo: any) => {
    if (['HEAD', 'CHEST', 'LEGS', 'WEAPON'].includes(itemInfo.type)) {
      equipItem(itemInfo.type.toLowerCase() as any, itemId);
      useGameStore.getState().showToast(`Equipped ${itemInfo.name}`);
    } else if (itemInfo.type === 'FOOD' || itemInfo.type === 'CONSUMABLE') {
      if (itemInfo.stats?.hp) {
        useGameStore.getState().modifyHp(itemInfo.stats.hp);
        useGameStore.getState().modifyInventory(itemId, -1);
        useGameStore.getState().showToast(`Used ${itemInfo.name}`);
      }
    }
  };

  const playerState = useGameStore(state => state.player);
  const maxWeight = playerState.maxWeight || (playerState.perk === 'PACK_MULE' ? 150 : 100);
  const currentWeight = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);

  return (
    <RpgPanel title="INVENTORY" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex justify-between items-center bg-black/60 p-2.5 rounded border border-[#3e2723] mb-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[#e0e0e0] font-bold font-mono text-xs">CREDITS:</span>
          <span className="text-yellow-400 font-bold font-mono text-base">{credits.toLocaleString()} C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#e0e0e0] font-bold font-mono text-xs">CARRY WEIGHT:</span>
          <span className={`font-bold font-mono text-base ${currentWeight > maxWeight ? 'text-red-400' : 'text-emerald-400'}`}>
            {currentWeight} / {maxWeight} kg
          </span>
          {playerState.perk === 'PACK_MULE' && (
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold">PACK MULE</span>
          )}
        </div>
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
              
              const isEquipped = Object.values(equipment).includes(itemId);

              return (
                <div 
                  key={itemId} 
                  onClick={() => handleItemClick(itemId, itemInfo)}
                  className={`relative aspect-square bg-[#1a1a1a] border-2 rounded transition-colors cursor-pointer group flex items-center justify-center shadow-inner ${isEquipped ? 'border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'border-[#3e2723] hover:border-[#ca8a04]'}`}
                >
                  {/* Item Icon Placeholder */}
                  <span className={`font-mono text-xs text-center p-1 break-all ${isEquipped ? 'text-[#4ade80]' : 'text-[#a1887f]'}`}>
                    {itemInfo.name}
                  </span>
                  
                  {/* Quantity Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-black border border-[#3e2723] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    {quantity}
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/95 border border-[#ca8a04] p-2 rounded z-50 text-xs shadow-lg pointer-events-none">
                    <p className="text-white font-bold mb-1">{itemInfo.name}</p>
                    <p className="text-slate-300 italic mb-1">{itemInfo.description}</p>
                    {itemInfo.stats?.atk && <p className="text-red-400 font-mono">+ {itemInfo.stats.atk} ATK</p>}
                    {itemInfo.stats?.def && <p className="text-blue-400 font-mono">+ {itemInfo.stats.def} DEF</p>}
                    {itemInfo.stats?.hp && <p className="text-green-400 font-mono">+ {itemInfo.stats.hp} HP</p>}
                    <p className="text-yellow-500 mt-2 uppercase text-[10px]">{itemInfo.type}</p>
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
