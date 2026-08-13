'use client';

import { useGameStore } from './store';
import { ITEM_DB } from './data/items';
import { useState } from 'react';

export default function InventoryOverlay() {
  const inventory = useGameStore(state => state.player.inventory);
  const equipment = useGameStore(state => state.player.equipment);
  const setGameMode = useGameStore(state => state.setGameMode);
  const credits = useGameStore(state => state.player.credits);
  const equipItem = useGameStore(state => state.equipItem);

  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleItemClick = (itemId: string, itemInfo: any) => {
    setActiveItem(itemId);
  };

  const handleItemAction = (itemId: string, itemInfo: any) => {
    if (['HEAD', 'CHEST', 'LEGS', 'WEAPON'].includes(itemInfo.type)) {
      equipItem(itemInfo.type.toLowerCase() as any, itemId);
      useGameStore.getState().showToast(`Equipped ${itemInfo.name}`);
    } else if (itemInfo.type === 'FOOD' || itemInfo.type === 'CONSUMABLE') {
      if (itemInfo.stats?.hp) {
        useGameStore.getState().modifyHp(itemInfo.stats.hp);
        useGameStore.getState().modifyInventory(itemId, -1);
        useGameStore.getState().showToast(`Used ${itemInfo.name}`);
        if (inventory[itemId] === 1) setActiveItem(null); // Deselect if last consumed
      }
    }
  };

  const playerState = useGameStore(state => state.player);
  const maxWeight = playerState.maxWeight || (playerState.perk === 'PACK_MULE' ? 150 : 100);
  const currentWeight = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="flex h-full w-full flex-col p-3 md:p-4 animate-in fade-in">
      <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-[#22d3ee]/30 mb-4 gap-4 shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200 font-bold font-mono text-xs">CREDITS:</span>
          <span className="text-cyan-400 font-bold font-mono text-base drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{credits.toLocaleString()} C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-200 font-bold font-mono text-xs">CARRY WEIGHT:</span>
          <span className={`font-bold font-mono text-base ${currentWeight > maxWeight ? 'text-red-400' : 'text-[#4ade80]'}`}>
            {currentWeight} / {maxWeight} kg
          </span>
          {playerState.perk === 'PACK_MULE' && (
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold">PACK MULE</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-4 h-full min-h-[300px]">
        {/* Left Side: Inventory Grid */}
        <div className="flex-[2] overflow-y-auto custom-scrollbar pr-2 border-r border-[#22d3ee]/20">
          {Object.keys(inventory).length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 font-mono italic">
              Your inventory is empty.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {Object.entries(inventory).map(([itemId, quantity]) => {
                if (quantity <= 0) return null;
                const itemInfo = ITEM_DB[itemId] || { name: itemId, description: 'Unknown item', type: 'UNKNOWN', spriteKey: 'unknown' };
                
                const isEquipped = Object.values(equipment).includes(itemId);
                const isSelected = activeItem === itemId;

                return (
                  <div 
                    key={itemId} 
                    onClick={() => handleItemClick(itemId, itemInfo)}
                    className={`relative aspect-square bg-black/50 border-2 rounded transition-all cursor-pointer group flex items-center justify-center shadow-inner 
                      ${isSelected ? 'border-[#22d3ee] shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105 z-10' : 
                      isEquipped ? 'border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.2)]' : 
                      'border-white/10 hover:border-[#22d3ee]/50'}`}
                  >
                    {/* Item Icon Placeholder */}
                    <span className={`font-mono text-xs text-center p-1 break-all ${isEquipped ? 'text-[#4ade80]' : isSelected ? 'text-[#22d3ee]' : 'text-slate-500'}`}>
                      {itemInfo.name.substring(0, 8)}
                    </span>
                    
                    {/* Quantity Badge */}
                    <div className="absolute -bottom-1.5 -right-1.5 bg-black border border-[#22d3ee]/50 text-cyan-100 text-[10px] font-bold px-1.5 rounded-sm shadow">
                      {quantity}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Item Details Panel */}
        <div className="flex-[1] flex flex-col bg-black/40 rounded p-4 border border-[#22d3ee]/20 shadow-inner">
          {activeItem && ITEM_DB[activeItem] && inventory[activeItem] > 0 ? (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-black/60 border border-[#22d3ee]/50 rounded flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] mx-auto">
                <span className="text-cyan-400 font-mono text-xs text-center break-all">{ITEM_DB[activeItem].name}</span>
              </div>
              <h3 className="text-cyan-100 font-bold text-center mb-1 text-lg">{ITEM_DB[activeItem].name}</h3>
              <div className="text-center mb-4">
                <span className="bg-[#1e293b] text-[#94a3b8] text-[10px] px-2 py-0.5 rounded font-mono uppercase border border-[#334155]">{ITEM_DB[activeItem].type}</span>
              </div>
              
              <div className="text-[#a1a1aa] text-sm mb-4 flex-1 font-sans leading-relaxed text-center">
                {ITEM_DB[activeItem].description}
              </div>

              {ITEM_DB[activeItem].stats && (
                <div className="bg-black/50 p-3 rounded border border-white/10 mb-4">
                  {Object.entries(ITEM_DB[activeItem].stats).map(([stat, val]) => (
                    <div key={stat} className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400 text-xs uppercase font-mono">{stat}</span>
                      <span className="text-[#4ade80] text-sm font-bold">+{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={() => handleItemAction(activeItem, ITEM_DB[activeItem])}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider rounded border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all active:scale-95"
              >
                {['HEAD', 'CHEST', 'LEGS', 'WEAPON'].includes(ITEM_DB[activeItem].type) ? 'Equip Item' : 'Use Item'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <div className="w-16 h-16 border-2 border-dashed border-slate-600 rounded mb-4" />
              <p className="font-mono text-xs">Select an item to view details</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #22d3ee; border-radius: 4px; opacity: 0.5; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #67e8f9; }
      `}} />
    </div>
  );
}
